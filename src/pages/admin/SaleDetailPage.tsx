import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, QrCode, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MOCK_SALES, formatCurrency, type Sale, type SaleTicket } from "@/lib/sales-data";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";

function StatusBadge({ status }: { status: Sale["status"] }) {
  return (
    <span
      className={cn(
        "inline-block rounded-[var(--radius-full)] px-2.5 py-0.5 text-micro font-medium",
        status === "Pago" && "bg-accent-muted text-accent-text",
        status === "Pendente" && "bg-warning/15 text-warning",
        status === "Cancelado" && "bg-error/15 text-error",
      )}
    >
      {status}
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

const card =
  "border border-border-subtle bg-bg-secondary p-5 shadow-[var(--shadow-sm)]";

export function SaleDetailPage({ id }: { id: string }) {
  const found = MOCK_SALES.find((s) => s.id === id);
  const [status, setStatus] = useState<Sale["status"]>(found?.status ?? "Pago");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [qrTicket, setQrTicket] = useState<SaleTicket | null>(null);

  if (!found) {
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

  const sale = found;

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
          <h1 className="text-heading-1 text-text-primary">{sale.eventName}</h1>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              generateCheckinListPdf(
                sale.eventName,
                sale.tickets.map((t) => t.participantName),
              )
            }
            className="inline-flex items-center gap-2 border border-border-default bg-bg-tertiary px-4 py-2 text-body text-text-primary transition-colors hover:border-accent"
          >
            <FileText className="h-4 w-4" />
            Gerar lista PDF
          </button>
          <button
            type="button"
            disabled={status === "Cancelado"}
            onClick={() => setConfirmOpen(true)}
            className="bg-error px-4 py-2 text-body font-semibold text-[#ffffff] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar venda
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-4 text-heading-2 text-text-primary">Comprador</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" value={sale.buyerName} />
            <Field label="WhatsApp" value={sale.buyerWhatsapp} />
            <Field label="E-mail" value={sale.buyerEmail ?? "—"} />
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-4 text-heading-2 text-text-primary">Dados da venda</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Evento" value={sale.eventName} />
            <Field label="Lote" value={sale.lotName} />
            <Field label="Quantidade" value={`${sale.quantity} ingresso(s)`} />
            <Field label="Valor" value={formatCurrency(sale.amount)} />
            <Field label="Origem" value={sale.origin} />
            <Field label="Forma de pagamento" value={sale.paymentMethod} />
            <Field label="Data da compra" value={sale.createdAt} />
            {sale.note && <Field label="Observação" value={sale.note} />}
          </div>
        </section>
      </div>

      <section className={card}>
        <h2 className="mb-4 text-heading-2 text-text-primary">
          Ingressos gerados ({sale.tickets.length})
        </h2>
        <div className="space-y-2">
          {sale.tickets.map((ticket) => (
            <div
              key={ticket.code}
              className="flex flex-col gap-3 border border-border-subtle bg-bg-primary p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-body text-text-primary">{ticket.participantName}</p>
                <p className="font-mono-token mt-1 text-text-secondary">{ticket.code}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-[var(--radius-full)] px-2.5 py-0.5 text-micro font-medium",
                    ticket.checkedIn
                      ? "bg-accent-muted text-accent-text"
                      : "bg-bg-tertiary text-text-secondary",
                  )}
                >
                  {ticket.checkedIn ? "Check-in realizado" : "Aguardando check-in"}
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
              Esta ação invalida os {sale.tickets.length} ingresso(s) desta venda.
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
                onClick={() => {
                  setStatus("Cancelado");
                  setConfirmOpen(false);
                  toast.success("Venda cancelada");
                }}
                className="bg-error px-4 py-2 text-body font-semibold text-[#ffffff] hover:opacity-90"
              >
                Confirmar cancelamento
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
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrTicket.code)}`}
              className="mx-auto mt-4 h-[220px] w-[220px] bg-bg-primary"
              loading="lazy"
            />
            <p className="mt-4 text-body text-text-primary">{qrTicket.participantName}</p>
            <p className="font-mono-token mt-1 text-text-secondary">{qrTicket.code}</p>
          </div>
        </div>
      )}
    </div>
  );
}
