import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
 * Botão do cabeçalho (ao lado do sino) que confere os pagamentos com o
 * Mercado Pago. SOMENTE LEITURA: nada é alterado nas vendas.
 * Só aparece para admin, porque a função do servidor só aceita admin.
 */
export function MpReconcileButton() {
  const { organizationId, userRole } = useAuth();
  const reconcile = useServerFn(reconcileMpPayments);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (userRole !== "admin") return null;

  const run = async () => {
    if (!organizationId) return;
    setBusy(true);
    setErrorMessage(null);
    setResult(null);
    try {
      setResult(await reconcile({ data: { organization_id: organizationId, days: 7 } }));
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível conferir os pagamentos.");
    } finally {
      setBusy(false);
    }
  };

  const openAndRun = () => {
    setOpen(true);
    void run();
  };

  const critical = result?.discrepancies.filter((d) => d.severity === "critico").length ?? 0;

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={openAndRun}
              aria-label="Conferir pagamentos com o Mercado Pago"
              className="text-[var(--text-secondary)]"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-center">
            Confere se os pagamentos dos últimos 7 dias batem com o Mercado Pago. Só leitura, nada é alterado.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Conferência com o Mercado Pago</DialogTitle>
            <DialogDescription>Últimos 7 dias. Só leitura: nenhuma venda é alterada.</DialogDescription>
          </DialogHeader>

          {busy && (
            <p className="flex items-center gap-2 text-small text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Conferindo os pagamentos...
            </p>
          )}

          {errorMessage && (
            <p className="flex items-start gap-2 text-small text-error">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorMessage}
            </p>
          )}

          {result && result.discrepancies.length === 0 && (
            <p className="flex items-center gap-2 text-small text-text-primary">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              Tudo certo: {result.checked} pagamentos conferidos nos últimos {result.days} dias, nenhuma divergência.
            </p>
          )}

          {result && result.discrepancies.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-small font-semibold text-text-primary">
                <AlertTriangle className="h-4 w-4 shrink-0 text-error" />
                {result.discrepancies.length} {result.discrepancies.length === 1 ? "divergência" : "divergências"} em{" "}
                {result.checked} pagamentos conferidos{critical > 0 ? `, ${critical} crítica${critical > 1 ? "s" : ""}` : ""}.
              </p>
              <ul className="space-y-2">
                {result.discrepancies.map((d) => (
                  <li key={d.saleId} className="rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary px-3 py-2 text-small">
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
            <p className="text-small text-text-secondary">Foram conferidas as {result.checked} vendas mais recentes.</p>
          )}

          {!busy && (result || errorMessage) && (
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={run}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Conferir de novo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
