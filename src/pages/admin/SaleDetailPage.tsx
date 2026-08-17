import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, QrCode, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/sales-data";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { useAuth } from "@/lib/auth-context";
import { useSale } from "@/lib/sales-queries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

function StatusBadge({ status }: { status: string }) {
  const statusLabels: Record<string, string> = {
    pago: "Pago",
    pendente: "Pendente",
    cancelado: "Cancelado",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-[var(--radius-full)] px-2.5 py-0.5 text-micro font-medium capitalize",
        status === "pago" && "bg-accent-muted text-accent-text",
        status === "pendente" && "bg-warning-muted text-warning-text",
        status === "cancelado" && "bg-error-muted text-error-text",
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-small text-text-secondary">{label}</p>
      <p className="mt-1 text-body text-text-primary">{value}</p>
    </div>
  );
}

const card = "border border-border-subtle bg-bg-secondary p-5 shadow-[var(--shadow-sm)]";

export function SaleDetailPage({ id }: { id: string }) {
  const { data: sale, isLoading, error: fetchError } = useSale(id);
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const isColab = userRole === "colaborador";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [qrTicket, setQrTicket] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (fetchError || !sale) {
    return (
      <div className={card}>
        <h1 className="text-heading-1 text-text-primary">Venda não encontrada</h1>
        <p className="mt-2 text-body text-text-secondary">
          A venda #{id} não existe ou foi removida.
        </p>
        <Link
          to="/admin/vendas"
          className="mt-4 inline-flex items-center gap-2 text-body text-accent-text"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para vendas
        </Link>
      </div>
    );
  }

  const handleCancelSale = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase.rpc("cancel_sale", {
        _sale_id: id,
      });

      if (error) throw error;

      toast.success("Venda cancelada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error("Erro ao cancelar venda: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const eventTitle = (sale.events as any)?.title || "Evento não identificado";
  const batchName = (sale.ticket_batches as any)?.name || "Lote não identificado";
  const formattedDate = new Date(sale.created_at).toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      <Link
        to="/admin/vendas"
        className="inline-flex items-center gap-2 text-small text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Vendas
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-heading-1 text-text-primary">{eventTitle}</h1>
          <StatusBadge status={sale.status} />
        </div>
        <div className="flex items-center gap-3">
          {!isColab && (
            <>
              <button
                type="button"
                onClick={() =>
                  generateCheckinListPdf(
                    eventTitle,
                    (sale.tickets || []).map((t: any) => t.participant_name),
                  )
                }
                className="inline-flex items-center gap-2 border border-border-default bg-bg-tertiary px-4 py-2 text-body text-text-primary transition-colors hover:border-accent"
              >
                <FileText className="h-4 w-4" />
                Gerar lista PDF
              </button>
              <button
                type="button"
                disabled={sale.status === "cancelado" || cancelling}
                onClick={() => setConfirmOpen(true)}
                className="bg-error px-4 py-2 text-body font-semibold text-[#ffffff] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? "Cancelando..." : "Cancelar venda"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-4 text-heading-2 text-text-primary">Comprador</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" value={sale.buyer_name} />
            <Field label="WhatsApp" value={sale.buyer_whatsapp} />
            <Field label="E-mail" value={sale.buyer_email ?? "—"} />
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-4 text-heading-2 text-text-primary">Dados da venda</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Evento" value={eventTitle} />
            <Field label="Lote" value={batchName} />
            <Field label="Quantidade" value={`${sale.quantity} ingresso(s)`} />
            <Field label="Valor" value={formatCurrency(sale.total_amount)} />
            <Field label="Origem" value={sale.origin} />
            <Field label="Forma de pagamento" value={sale.payment_method} />
            <Field label="Data da compra" value={formattedDate} />
            {sale.observation && <Field label="Observação" value={sale.observation} />}
          </div>
        </section>
      </div>

      <section className={card}>
        <h2 className="mb-4 text-heading-2 text-text-primary">
          Ingressos gerados ({(sale.tickets || []).length})
        </h2>
        <div className="space-y-2">
          {(sale.tickets || []).map((ticket: any) => (
            <div
              key={ticket.code}
              className="flex flex-col gap-3 border border-border-subtle bg-bg-primary p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-body text-text-primary">{ticket.participant_name}</p>
                <p className="font-mono-token mt-1 text-text-secondary">{ticket.code}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-[var(--radius-full)] px-2.5 py-0.5 text-micro font-medium",
                    ticket.checked_in
                      ? "bg-accent-muted text-accent-text"
                      : "bg-bg-tertiary text-text-secondary",
                  )}
                >
                  {ticket.checked_in ? "Check-in realizado" : "Aguardando check-in"}
                </span>
                <button
                  type="button"
                  onClick={() => setQrTicket(ticket)}
                  className="inline-flex items-center gap-2 border border-border-default bg-bg-tertiary px-3 py-1.5 text-small text-text-primary transition-colors hover:border-accent"
                >
                  <QrCode className="h-4 w-4" />
                  Ver QR Code
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-6">
          <div className="w-full max-w-[420px] border border-border-subtle bg-bg-primary p-6 shadow-[var(--shadow-lg)]">
            <h3 className="text-heading-2 text-text-primary">Cancelar venda?</h3>
            <p className="mt-2 text-body text-text-secondary">
              Esta ação invalida os {(sale.tickets || []).length} ingresso(s) desta venda.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="border border-border-default bg-bg-tertiary px-4 py-2 text-body text-text-primary hover:border-accent"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelSale}
                disabled={cancelling}
                className="bg-error px-4 py-2 text-body font-semibold text-[#ffffff] hover:opacity-90 disabled:opacity-50"
              >
                {cancelling ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-6">
          <div className="w-full max-w-[360px] border border-border-subtle bg-bg-primary p-6 text-center shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between">
              <h3 className="text-heading-2 text-text-primary">QR Code</h3>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setQrTicket(null)}
                className="p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              alt={`QR Code do ingresso ${qrTicket.code}`}
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrTicket.code || "")}`}
              className="mx-auto mt-4 h-[220px] w-[220px] bg-bg-primary"
              loading="lazy"
            />
            <p className="mt-4 text-body text-text-primary">{qrTicket.participant_name}</p>
            <p className="font-mono-token mt-1 text-text-secondary">{qrTicket.code}</p>
          </div>
        </div>
      )}
    </div>
  );
}
