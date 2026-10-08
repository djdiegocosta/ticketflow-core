import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { decrypt } from "./utils.server";
import { classifySale, sortDiscrepancies, type Discrepancy, type MpPaymentSnapshot, type ReconcileSale } from "./reconcile";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Limites para a conferência nunca virar uma carga pesada no Mercado Pago.
const MAX_SALES_PER_RUN = 120;
const CONCURRENCY = 4;
const LOOKUP_TIMEOUT_MS = 8000;

async function assertOrgAdmin(userId: string, organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Sem permissão para conferir pagamentos desta organização");
}

async function lookupPayment(
  accessToken: string,
  paymentId: string,
): Promise<{ payment: MpPaymentSnapshot | null; error?: string }> {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return { payment: null, error: `Mercado Pago respondeu ${res.status} para este pagamento.` };
    const body = (await res.json()) as {
      status?: string;
      transaction_amount?: number;
      external_reference?: string | null;
    };
    const amount = Number(body.transaction_amount);
    return {
      payment: {
        status: String(body.status ?? "desconhecido"),
        amount: Number.isFinite(amount) ? amount : null,
        externalReference: body.external_reference ? String(body.external_reference) : null,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { payment: null, error: `Falha ao consultar o Mercado Pago: ${message}` };
  }
}

/**
 * Conferência SOMENTE LEITURA: compara vendas com Pix gerado nos últimos dias
 * com o status real do pagamento no Mercado Pago. Não altera nenhuma venda.
 */
export const reconcileMpPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      organization_id: z.string().uuid(),
      days: z.number().int().min(1).max(30).default(7),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertOrgAdmin(context.userId, data.organization_id);

    const { data: configs } = await supabaseAdmin
      .from("mp_config")
      .select("*")
      .eq("organization_id", data.organization_id);
    const config =
      configs?.find((c) => c.environment === "producao" && c.validated_at) ??
      configs?.find((c) => c.environment === "sandbox");
    if (!config?.access_token_encrypted) throw new Error("Mercado Pago não configurado para esta organização");

    let accessToken: string;
    try {
      accessToken = await decrypt(config.access_token_encrypted);
    } catch {
      throw new Error("Não foi possível ler as credenciais salvas do Mercado Pago.");
    }

    const since = new Date(Date.now() - data.days * 24 * 3600_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("sales")
      .select("id, sale_code, status, total_amount, mp_payment_id, created_at, buyer_name")
      .eq("organization_id", data.organization_id)
      .not("mp_payment_id", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_SALES_PER_RUN + 1);
    if (error) throw new Error(error.message);

    const all = (rows ?? []) as unknown as ReconcileSale[];
    const truncated = all.length > MAX_SALES_PER_RUN;
    const sales = all.slice(0, MAX_SALES_PER_RUN);

    const discrepancies: Discrepancy[] = [];
    for (let i = 0; i < sales.length; i += CONCURRENCY) {
      const batch = sales.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((sale) => lookupPayment(accessToken, sale.mp_payment_id)));
      batch.forEach((sale, index) => {
        const result = results[index]!;
        const item = classifySale(sale, result.payment, result.error);
        if (item) discrepancies.push(item);
      });
    }

    return {
      environment: config.environment as string,
      days: data.days,
      checked: sales.length,
      truncated,
      discrepancies: sortDiscrepancies(discrepancies),
    };
  });
