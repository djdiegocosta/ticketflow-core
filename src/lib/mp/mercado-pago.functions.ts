import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function getMpCredentials(environment: "sandbox" | "producao") {
  const { data, error } = await supabaseAdmin.rpc("get_mp_credentials", {
    _environment: environment,
  });
  if (error) throw new Error(error.message);
  const credentials = Array.isArray(data) ? data[0] : data;
  if (!credentials?.access_token) return null;
  return credentials as {
    access_token: string;
    webhook_secret: string | null;
    public_key: string | null;
  };
}

export const saveMpCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z
      .object({
        organization_id: z.string().uuid(),
        environment: z.enum(["sandbox", "producao"]),
        public_key: z.string(),
        access_token: z.string(),
        webhook_secret: z.string().optional(),
      })
      .parse,
  )
  .handler(async ({ data, context }) => {
    await assertOrgAdmin(context.userId, data.organization_id);
    const accessToken = data.access_token.trim();
    if (!accessToken) throw new Error("Access Token é obrigatório");
    const { error } = await supabaseAdmin.rpc("set_mp_credentials", {
      _environment: data.environment,
      _access_token: accessToken,
      _webhook_secret: data.webhook_secret?.trim() || null,
      _public_key: data.public_key.trim(),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const validateMpCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ organization_id: z.string().uuid(), environment: z.enum(["sandbox", "producao"]) }).parse)
  .handler(async ({ data, context }) => {
    await assertOrgAdmin(context.userId, data.organization_id);
    const config = await getMpCredentials(data.environment);
    if (!config?.access_token) throw new Error("Configuração não encontrada");
    const mpRes = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${config.access_token}` },
    });
    if (!mpRes.ok) throw new Error("Credenciais inválidas ou expiradas");
    const { error } = await supabaseAdmin.from("mp_config").update({ validated_at: new Date().toISOString() }).eq("environment", data.environment);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const testMpWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ organization_id: z.string().uuid(), environment: z.enum(["sandbox", "producao"]) }).parse)
  .handler(async ({ data, context }) => {
    await assertOrgAdmin(context.userId, data.organization_id);
    const config = await getMpCredentials(data.environment);
    if (!config) return { status: "Não configurado" as const };
    if (!config.webhook_secret) return { status: "Segredo do webhook não configurado" as const };
    return { status: "Configurado" as const };
  });

export const createMpTestSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ organization_id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await assertOrgAdmin(context.userId, data.organization_id);
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("status", "publicado")
      .eq("is_closed", false)
      .order("event_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (eventError || !event) throw new Error("Nenhum evento publicado disponível para o teste");
    const { data: batch, error: batchError } = await supabaseAdmin
      .from("ticket_batches")
      .select("id")
      .eq("event_id", event.id)
      .eq("is_courtesy", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (batchError || !batch) throw new Error("Nenhum lote pago disponível para o teste");
    const saleCode = `MPTEST-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("sales")
      .insert({
        event_id: event.id,
        batch_id: batch.id,
        buyer_name: "Teste Mercado Pago",
        buyer_whatsapp: "22999999999",
        buyer_email: "teste@ticketflow.local",
        quantity: 1,
        unit_price: 0.01,
        total_amount: 0.01,
        status: "pendente",
        origin: "manual",
        payment_method: "pix_ticketflow",
        sale_code: saleCode,
        pending_participant_names: ["Teste Mercado Pago"],
      })
      .select("id, sale_code")
      .single();
    if (saleError || !sale) throw new Error(saleError?.message || "Não foi possível criar a venda de teste");
    return { sale_id: sale.id, sale_code: sale.sale_code };
  });

export const createMpPix = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sale_id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const { data: sale, error: saleError } = await supabaseAdmin.from("sales").select("*").eq("id", data.sale_id).single();
    if (saleError || !sale) throw new Error("Venda não encontrada");
    if (sale.status !== "pendente") throw new Error("A venda já foi processada");
    if (sale.expires_at && new Date(sale.expires_at) <= new Date()) throw new Error("Esta reserva expirou");
    let config = await getMpCredentials("producao");
    if (!config) config = await getMpCredentials("sandbox");
    if (!config?.access_token) throw new Error("Mercado Pago não configurado para esta organização");
    const siteUrl = process.env["VITE_SITE_URL"] || "https://ticketflow2.lovable.app";
    const { data: orgId, error: orgError } = await supabaseAdmin.rpc("get_single_organization_id");
    if (orgError || !orgId) throw new Error("Organização não encontrada para o webhook");
    const notificationUrl = `${siteUrl}/api/public/mp/webhook?org_id=${orgId}`;
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.access_token}`, "Content-Type": "application/json", "X-Idempotency-Key": sale.id },
      body: JSON.stringify({
        transaction_amount: Number(sale.total_amount),
        description: `Ingresso TicketFlow - Venda ${sale.sale_code}`,
        payment_method_id: "pix",
        external_reference: sale.id,
        notification_url: notificationUrl,
        payer: { email: sale.buyer_email, first_name: sale.buyer_name.split(" ")[0], last_name: sale.buyer_name.split(" ").slice(1).join(" ") || "Cliente" },
      }),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) throw new Error(mpData.message || "Erro ao gerar PIX");
    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
    if (!qrCode || !qrCodeBase64) throw new Error("Mercado Pago não retornou o QR Code PIX");
    const mpPaymentId = String(mpData.id);
    const { error: updateError } = await supabaseAdmin.from("sales").update({ mp_payment_id: mpPaymentId, mp_qr_code: qrCode, mp_qr_code_base64: qrCodeBase64 }).eq("id", sale.id).eq("status", "pendente");
    if (updateError) throw new Error(updateError.message);
    return { qr_code: qrCode, qr_code_base64: qrCodeBase64, payment_id: mpPaymentId };
  });
