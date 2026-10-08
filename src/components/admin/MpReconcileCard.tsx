import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/sales-queries";
import { reconcileMpPayments } from "@/lib/mp/reconcile.functions";
import type { Discrepancy } from "@/lib/mp/reconcile";

type Result = Awaited<ReturnType<typeof reconcileMpPayments>>;

const SEVERITY_LABEL: Record<Discrepancy["severity"], string> = {
  critico: "Crítico",
  importante: "Importante",
  aviso: "Aviso",
};

/**
 * Conferência SOMENTE LEITURA com o Mercado Pago: mostra pagamentos que o
 * cliente fez mas que o sistema não confirmou (e o contrário). Não altera vendas.
 */
export function MpReconcileCard() {
  const { organizationId, userRole } = useAuth();
  const reconcile = useServerFn(reconcileMpPayments);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    if (!organizationId) return;
    setBusy(true);
    try {
      setResult(await reconcile({ data: { organization_id: organizationId, days: 7 } }));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Não foi possível conferir os pagamentos.");
    } finally {
      setBusy(false);
    }
  };

  // A função do servidor só aceita admin; colaborador nem vê o cartão.
  if (userRole !== "admin") return null;

  const critical = result?.discrepancies.filter((d) => d.severity === "critico").length ?? 0;

  return (
    <div className="rounded-[var(--radius-md)] border border-border-default bg-bg-secondary px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-text-primary">Conferir pagamentos com o Mercado Pago</p>
          <p className="text-small text-text-secondary">
            Compara as vendas dos últimos 7 dias com o que o Mercado Pago registrou. Só leitura: nada é alterado.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={run} disabled={busy || !organizationId}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {busy ? "Conferindo..." : "Conferir agora"}
        </Button>
      </div>

      {result && result.discrepancies.length === 0 && (
        <p className="mt-3 flex items-center gap-2 text-small text-text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          Tudo certo: {result.checked} pagamentos conferidos nos últimos {result.days} dias, nenhuma divergência.
        </p>
      )}

      {result && result.discrepancies.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="flex items-center gap-2 text-small font-semibold text-text-primary">
            <AlertTriangle className="h-4 w-4 shrink-0 text-error" />
            {result.discrepancies.length} {result.discrepancies.length === 1 ? "divergência" : "divergências"} em{" "}
            {result.checked} pagamentos conferidos{critical > 0 ? `, ${critical} crítica${critical > 1 ? "s" : ""}` : ""}.
          </p>
          <ul className="space-y-2">
            {result.discrepancies.map((d) => (
              <li key={d.saleId} className="rounded-[var(--radius-sm)] border border-border-default bg-bg-primary px-3 py-2 text-small">
                <p className="font-semibold text-text-primary">
                  [{SEVERITY_LABEL[d.severity]}] Venda {d.saleCode ?? d.saleId.slice(0, 8)}
                  {d.buyerName ? ` — ${d.buyerName}` : ""} — {formatCurrency(d.saleAmount)}
                </p>
                <p className="text-text-secondary">{d.detail}</p>
                <p className="text-text-secondary">
                  Sistema: {d.saleStatus} · Mercado Pago: {d.mpStatus ?? "sem resposta"} · Pagamento nº {d.mpPaymentId}
                </p>
              </li>
            ))}
          </ul>
          {critical > 0 && (
            <p className="text-small text-text-secondary">
              Não reembolse nem refaça essas vendas antes de conferir. Fale com o suporte técnico.
            </p>
          )}
        </div>
      )}
      {result?.truncated && (
        <p className="mt-2 text-small text-text-secondary">Foram conferidas as {result.checked} vendas mais recentes.</p>
      )}
    </div>
  );
}
