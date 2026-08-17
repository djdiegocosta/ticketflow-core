import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MessageCircle, Receipt, Ticket, User } from "lucide-react";
import { getInitials, whatsappLink } from "@/lib/clients-data";
import { formatCurrency } from "@/lib/sales-queries";
const MOCK_CLIENTS: any[] = [];
const MOCK_SALES: any[] = [];
import { StatusPill } from "@/components/admin/DataTable";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro text-text-secondary">{label}</span>
      <span className="text-body text-text-primary">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-micro text-text-secondary">{label}</span>
        <Icon className="h-4 w-4 text-text-secondary" />
      </div>
      <div className="text-heading-1 text-text-primary">{value}</div>
    </div>
  );
}

export function ClientDetailPage({ id }: { id: string }) {
  const client = MOCK_CLIENTS.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="space-y-4">
        <h1 className="text-heading-1 text-text-primary">Cliente não encontrado</h1>
        <Link to="/admin/clientes" className="text-body text-accent-text">
          Voltar para clientes
        </Link>
      </div>
    );
  }

  const history = MOCK_SALES.filter((s) => s.buyerName === client.name);

  return (
    <div className="space-y-6">
      <Link
        to="/admin/clientes"
        className="inline-flex items-center gap-2 text-small text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </Link>

      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border-subtle bg-bg-secondary p-5 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-full)] bg-bg-tertiary text-body font-semibold text-text-primary">
            {getInitials(client.name)}
          </span>
          <div>
            <h1 className="text-heading-1 text-text-primary">{client.name}</h1>
            <p className="text-small text-text-secondary">
              {client.whatsapp}
              {client.email ? ` · ${client.email}` : ""}
            </p>
          </div>
        </div>
        <a
          href={whatsappLink(client.whatsapp)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2.5 text-body font-semibold text-[#111111] transition-colors hover:bg-accent-hover"
        >
          <MessageCircle className="h-4 w-4" />
          Enviar WhatsApp
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingressos comprados" value={String(client.totalTickets)} icon={Ticket} />
        <StatCard label="Eventos participados" value={String(client.totalEvents)} icon={CalendarDays} />
        <StatCard label="Valor total gasto" value={formatCurrency(client.totalSpent)} icon={Receipt} />
        <StatCard label="Idade" value={`${client.age} anos`} icon={User} />
      </div>

      <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary p-5 shadow-[var(--shadow-sm)]">
        <h2 className="mb-4 text-heading-2 text-text-primary">Dados do cliente</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoRow label="Nome" value={client.name} />
          <InfoRow label="WhatsApp" value={client.whatsapp} />
          <InfoRow label="E-mail" value={client.email ?? "—"} />
          <InfoRow label="Último evento" value={client.lastEvent} />
          <InfoRow label="Última compra" value={client.lastPurchaseAt} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary shadow-[var(--shadow-sm)]">
        <div className="px-5 pt-5">
          <h2 className="text-heading-2 text-text-primary">Histórico de compras</h2>
        </div>
        <table className="mt-4 w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              {["Evento", "Lote", "Qtd.", "Valor", "Status", "Data"].map((h) => (
                <th key={h} className="px-5 py-3 text-small font-medium text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((sale) => (
              <tr key={sale.id} className="border-b border-border-subtle last:border-0">
                <td className="px-5 py-3 text-body text-text-primary">
                  <Link
                    to="/admin/vendas/$id"
                    params={{ id: sale.id }}
                    className="hover:text-accent-text"
                  >
                    {sale.eventName}
                  </Link>
                </td>
                <td className="px-5 py-3 text-small text-text-secondary">{sale.lotName}</td>
                <td className="px-5 py-3 text-small text-text-secondary">{sale.quantity}x</td>
                <td className="px-5 py-3 text-body font-semibold text-text-primary">
                  {formatCurrency(sale.amount)}
                </td>
                <td className="px-5 py-3 text-small text-text-secondary">
                  <StatusPill 
                    tone={
                      sale.status === "Pago" ? "accent" : 
                      sale.status === "Cancelado" ? "error" : "warning"
                    }
                  >
                    {sale.status}
                  </StatusPill>
                </td>
                <td className="px-5 py-3 text-small text-text-secondary">{sale.createdAt}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-small text-text-secondary">
                  Nenhuma compra registrada para este cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
