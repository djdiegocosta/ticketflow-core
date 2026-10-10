import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { encrypt, decrypt } from "./utils.server";
import { buildPixHeaders, buildPixPayload, DEVICE_ID_PATTERN } from "./pix-payload";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendPushToOrganization } from "@/lib/push.server";
import { decideReopen } from "./reopen-sale";

async function assertOrgAdmin(userId: string, organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Sem permissão para configurar esta organização");
}

export const saveMpCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ organization_id: z.string().uuid(), environment: z.enum(["sandbox", "producao"]), public_key: z.string(), access_token: z.string(), webhook_secret: z.string().optional() }).parse)
  .handler(async ({ data, context }) => {
    await assertOrgAdmin(context.userId, data.organization_id);
    const { data: existing } = await supabaseAdmin
      .from("mp_config")
      .select("public_key, access_token_encrypted, webhook_secret_encrypted")
      .eq("organization_id", data.organization_id)
      .eq("environment", data.environment)
      .maybeSingle();
    const token = data.access_token.trim();
    const secret = (data.webhook_secret ?? "").trim();
    const publicKey = data.public_key.trim();
    const encryptedToken = token ? await encrypt(token) : (existing?.access_token_encrypted ?? null);
    if (!encryptedToken) throw new Error("Access Token é obrigatório");
    const encryptedWebhookSecret = secret ? await encrypt(secret) : (existing?.webhook_secret_encrypted ?? null);
    const { error } = await supabaseAdmin.from("mp_config").upsert({
      organization_id: data.organization_id,
      environment: data.environment,
      public_key: publicKey || existing?.public_key || "",
      access_token_encrypted: encryptedToken,
      webhook_secret_encrypted: encryptedWebhookSecret,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,environment" });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const validateMpCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ organization_id: z.string().uuid(), environment: z.enum(["sandbox", "producao"]) }).parse)
  .handler(async ({ data, context }) => {
    await assertOrgAdmin(context.userId, data.organization_id);
    const { data: config, error: configError } = await supabaseAdmin.from("mp_config").select("access_token_encrypted").eq("organization_id", data.organization_id).eq("environment", data.environment).single();
    if (configError || !config) throw new Error("Configuração não encontrada");
    const accessToken = await decrypt(config.access_token_encrypted!);
    const mpRes = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!mpRes.ok) throw new Error("Credenciais inválidas ou expiradas");
    const { error } = await supabaseAdmin.from("mp_config").update({ validated_at: new Date().toISOString() }).eq("organization_id", data.organization_id).eq("environment", data.environment);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const testMpWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ organization_id: z.string().uuid(), environment: z.enum(["sandbox", "producao"]) }).parse)
  .handler(async ({ data, context }) => {
    await assertOrgAdmin(context.userId, data.organization_id);
    const { data: config, error: configError } = await supabaseAdmin.from("mp_config").select("webhook_secret_encrypted").eq("organization_id", data.organization_id).eq("environment", data.environment).single();
    if (configError || !config) throw new Error("Configuração não encontrada");
    if (!config.webhook_secret_encrypted) return { status: "Não configurado" };
    await decrypt(config.webhook_secret_encrypted);
    return { status: "Configurado" };
  });

// Chave pública do Mercado Pago (não é segredo — foi feita para ficar no site).
// Usada pela tela de pagamento para carregar o SDK oficial.
export const getMpPublicKey = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sale_id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const { data: sale } = await supabaseAdmin.from("sales").select("status, events!inner(organization_id)").eq("id", data.sale_id).maybeSingle();
    if (!sale || sale.status !== "pendente") return { public_key: null as string | null };
    const { data: configs } = await supabaseAdmin.from("mp_config").select("environment, public_key, validated_at").eq("organization_id", (sale as any).events.organization_id);
    const prod = configs?.find((c) => c.environment === "producao" && c.validated_at);
    const sandbox = configs?.find((c) => c.environment === "sandbox");
    return { public_key: (prod || sandbox)?.public_key?.trim() || null };
  });

export const createMpPix = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sale_id: z.string().uuid(), device_id: z.string().max(200).optional() }).parse)
  .handler(async ({ data }) => {
    // O identificador do dispositivo é só um reforço antifraude: se vier fora do formato
    // esperado, é descartado em vez de impedir a compra.
    const deviceId = data.device_id && DEVICE_ID_PATTERN.test(data.device_id) ? data.device_id : undefined;
    const { data: sale, error: saleError } = await supabaseAdmin.from("sales").select("*, events!inner(organization_id, title)").eq("id", data.sale_id).single();
    if (saleError || !sale) {
      console.error("Pix: venda não encontrada", data.sale_id, saleError?.message);
      throw new Error("Venda não encontrada");
    }
    // O prazo da reserva só dá urgência ao cliente: reserva expirada não impede o Pix.
    // Se ainda houver estoque, a reserva é reaberta; se o lote esgotou, avisa com clareza.
    let reopenedExpiresAt: string | null = null;
    const reservationExpired = !!sale.expires_at && new Date(sale.expires_at) <= new Date();
    if (sale.status !== "pendente" || reservationExpired) {
      const { data: reopenResult, error: reopenError } = await supabaseAdmin.rpc("reopen_expired_sale", { _sale_id: sale.id });
      if (reopenError) {
        console.error("Pix: falha ao reabrir reserva", sale.sale_code, reopenError.message);
        throw new Error("Não foi possível retomar esta reserva. Tente novamente.");
      }
      const decision = decideReopen(reopenResult);
      if (!decision.proceed) {
        console.error("Pix: reserva não reaberta", sale.sale_code, sale.status, reopenResult);
        throw new Error(decision.message);
      }
      const { data: fresh } = await supabaseAdmin.from("sales").select("expires_at").eq("id", sale.id).single();
      reopenedExpiresAt = fresh?.expires_at ?? null;
    }

    try {
      const orgId = sale.events.organization_id;
      const { data: configs } = await supabaseAdmin.from("mp_config").select("*").eq("organization_id", orgId);
      const prodConfig = configs?.find(c => c.environment === "producao" && c.validated_at);
      const sandboxConfig = configs?.find(c => c.environment === "sandbox");
      const config = prodConfig || sandboxConfig;
      if (!config) throw new Error("Mercado Pago não configurado para esta organização");
      let accessToken: string;
      try {
        accessToken = await decrypt(config.access_token_encrypted!);
      } catch {
        throw new Error("Não foi possível ler as credenciais salvas do Mercado Pago. Abra Configurações → Mercado Pago e salve novamente o Access Token.");
      }

      const siteUrl = process.env["VITE_SITE_URL"] || "https://ticketflow-core.vercel.app";
      const notificationUrl = `${siteUrl}/api/public/mp/webhook?org_id=${orgId}`;
      const { data: batch } = await supabaseAdmin.from("ticket_batches").select("name").eq("id", sale.batch_id).maybeSingle();
      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: buildPixHeaders(accessToken, sale.id, deviceId),
        body: JSON.stringify(
          buildPixPayload({ sale, eventTitle: sale.events.title, batchName: batch?.name, notificationUrl }),
        ),
      });
      const mpData = await mpRes.json();
      if (!mpRes.ok) {
        await supabaseAdmin.from("sales").update({
          mp_debug_response: JSON.stringify({ stage: "mp_rejected", status: mpRes.status, environment: config.environment, body: mpData }),
        } as never).eq("id", sale.id);
        throw new Error(mpData.message || "Erro ao gerar PIX");
      }
      const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
      if (!qrCode || !qrCodeBase64) {
        await supabaseAdmin.from("sales").update({
          mp_debug_response: JSON.stringify({ stage: "missing_qr_code", status: mpRes.status, environment: config.environment, body: mpData }),
        } as never).eq("id", sale.id);
        throw new Error("O Mercado Pago não retornou o QR Code do Pix");
      }
      const mpPaymentId = String(mpData.id);
      const isFirstPixCreation = !sale.mp_payment_id;
      const { error: updateError } = await supabaseAdmin.from("sales").update({ mp_payment_id: mpPaymentId, mp_qr_code: qrCode, mp_qr_code_base64: qrCodeBase64 }).eq("id", sale.id).eq("status", "pendente");
      if (updateError) throw new Error(updateError.message);

      if (isFirstPixCreation) {
        await sendPushToOrganization(orgId, {
          title: "Nova venda aguardando PIX",
          body: `Venda ${sale.sale_code ?? ""} criada. Aguardando pagamento de R$ ${Number(sale.total_amount).toFixed(2).replace(".", ",")}.`,
          url: "/admin/vendas",
          tag: `sale-pending-${sale.id}`,
        }).catch((pushError) => console.error("Push de venda pendente falhou:", pushError));
      }

      return { qr_code: qrCode, qr_code_base64: qrCodeBase64, payment_id: mpPaymentId, expires_at: reopenedExpiresAt };
    } catch (err: any) {
      console.error("Falha ao gerar Pix:", sale.sale_code, err?.message);
      await supabaseAdmin.from("sales").update({
        mp_debug_response: JSON.stringify({ stage: "exception", message: err?.message, name: err?.name, stack: String(err?.stack).slice(0, 2000) }),
      } as never).eq("id", sale.id);
      throw err;
    }

  });
