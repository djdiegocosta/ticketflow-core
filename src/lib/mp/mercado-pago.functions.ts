import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { encrypt, decrypt } from "./utils.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireMpAdmin } from "./admin-middleware";

export const saveMpCredentials = createServerFn({ method: "POST" })
  .middleware([requireMpAdmin])
  .inputValidator(z.object({
    organization_id: z.string().uuid(),
    environment: z.enum(["sandbox", "producao"]),
    public_key: z.string(),
    access_token: z.string(),
    webhook_secret: z.string().optional(),
  }).parse)
  .handler(async ({ data, context }) => {
    if (context.mpAdminOrganizationId !== data.organization_id) throw new Error("Acesso negado");

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
    const encryptedWebhookSecret = secret
      ? await encrypt(secret)
      : (existing?.webhook_secret_encrypted ?? null);

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
  .middleware([requireMpAdmin])
  .inputValidator(z.object({
    organization_id: z.string().uuid(),
    environment: z.enum(["sandbox", "producao"]),
  }).parse)
  .handler(async ({ data, context }) => {
    if (context.mpAdminOrganizationId !== data.organization_id) throw new Error("Acesso negado");
    const { data: config, error: configError } = await supabaseAdmin
      .from("mp_config")
      .select("access_token_encrypted")
      .eq("organization_id", data.organization_id)
      .eq("environment", data.environment)
      .single();
    if (configError || !config) throw new Error("Configuração não encontrada");
    const accessToken = await decrypt(config.access_token_encrypted!);
    const mpRes = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mpRes.ok) throw new Error("Credenciais inválidas ou expiradas");
    const { error } = await supabaseAdmin
      .from("mp_config")
      .update({ validated_at: new Date().toISOString() })
      .eq("organization_id", data.organization_id)
      .eq("environment", data.environment);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const testMpWebhook = createServerFn({ method: "POST" })
  .middleware([requireMpAdmin])
  .inputValidator(z.object({
    organization_id: z.string().uuid(),
    environment: z.enum(["sandbox", "producao"]),
  }).parse)
  .handler(async ({ data, context }) => {
    if (context.mpAdminOrganizationId !== data.organization_id) throw new Error("Acesso negado");
    const { data: config, error: configError } = await supabaseAdmin
      .from("mp_config")
      .select("webhook_secret_encrypted")
      .eq("organization_id", data.organization_id)
      .eq("environment", data.environment)
      .single();
    if (configError || !config) throw new Error("Configuração não encontrada");
    if (!config.webhook_secret_encrypted) return { status: "Não configurado" };
    await decrypt(config.webhook_secret_encrypted);
    return { status: "Configurado" };
  });

export const createMpPix = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sale_id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("sales")
      .select("*, events!inner(organization_id)")
      .eq("id", data.sale_id)
      .single();
    if (saleError || !sale) throw new Error("Venda não encontrada");
    if (sale.status !== "pendente") throw new Error("A venda já foi processada");
    if (sale.expires_at && new Date(sale.expires_at) <= new Date()) throw new Error("Esta reserva expirou");

    const orgId = sale.events.organization_id;
    const { data: configs } = await supabaseAdmin
      .from("mp_config")
      .select("*")
      .eq("organization_id", orgId);
    const prodConfig = configs?.find(c => c.environment === "producao" && c.validated_at);
    const sandboxConfig = configs?.find(c => c.environment === "sandbox");
    const config = prodConfig || sandboxConfig;
    if (!config) throw new Error("Mercado Pago não configurado para esta organização");

    const accessToken = await decrypt(config.access_token_encrypted!);
    const siteUrl = process.env["VITE_SITE_URL"] || "https://ticketflow2.lovable.app";
    const notificationUrl = `${siteUrl}/api/public/mp/webhook?org_id=${orgId}`;
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": sale.id,
      },
      body: JSON.stringify({
        transaction_amount: sale.total_amount,
        description: `Ingresso TicketFlow - Venda ${sale.sale_code}`,
        payment_method_id: "pix",
        external_reference: sale.id,
        notification_url: notificationUrl,
        payer: {
          email: sale.buyer_email,
          first_name: sale.buyer_name.split(" ")[0],
          last_name: sale.buyer_name.split(" ").slice(1).join(" ") || "Cliente",
        },
      }),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) throw new Error(mpData.message || "Erro ao gerar PIX");
    const qrCode = mpData.point_of_interaction.transaction_data.qr_code;
    const qrCodeBase64 = mpData.point_of_interaction.transaction_data.qr_code_base64;
    const mpPaymentId = String(mpData.id);
    const { error: updateError } = await supabaseAdmin
      .from("sales")
      .update({ mp_payment_id: mpPaymentId, mp_qr_code: qrCode, mp_qr_code_base64: qrCodeBase64 })
      .eq("id", sale.id)
      .eq("status", "pendente");
    if (updateError) throw new Error(updateError.message);
    return { qr_code: qrCode, qr_code_base64: qrCodeBase64, payment_id: mpPaymentId };
  });
