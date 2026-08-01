import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  FileText,
  Plus,
  Receipt,
  Search,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EVENTS, MOCK_SALES, formatCurrency, type Sale } from "@/lib/sales-data";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { ManualSaleModal } from "@/components/admin/sales/ManualSaleModal";
import { StatusPill } from "@/components/admin/DataTable";

const ORIGIN_TABS = ["Todas", "TicketFlow", "Manual", "Importadas"] as const;
const STATUS_OPTIONS = ["Todos", "Pago", "Pendente", "Cancelado"] as const;

const selectClass =
  "rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary px-3 py-2 text-body text-text-primary outline-none focus:border-accent";

function MiniMetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  iconColor,
  gaugeValue,
}: {
  title: string;
  value?: string;
  subtext?: string;
  icon: React.ElementType;
  iconColor?: string;
  gaugeValue?: number;
}) {
  return (
    <div className="flex h-full flex-col border border-border-subtle bg-bg-secondary p-3.5 shadow-[var(--shadow-sm)]">
      <div className="mb-1.5 flex items-start justify-between">
        <span className="text-small text-text-secondary">{title}</span>
        <Icon className={cn("h-4 w-4", iconColor ?? "text-text-secondary")} />
      </div>
      <div className="flex flex-1 items-end justify-between gap-2">
        <div className="flex-1">
          <div className="text-heading-1 text-text-primary">{value}</div>
          {subtext && <div className="mt-0.5 text-small text-text-secondary">{subtext}</div>}
        </div>
        {gaugeValue !== undefined && (
          <div className="relative h-[38px] w-[68px] shrink-0">
            <svg viewBox="0 0 90 50" width="68" height="38" className="block">
              <path
                d="M 8 46 A 37 37 0 0 1 82 46"
                fill="none"
                stroke="var(--bg-tertiary)"
                strokeWidth={10}
                strokeLinecap="round"
              />
              <path
                d="M 8 46 A 37 37 0 0 1 82 46"
                fill="none"
                stroke="var(--warning)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={Math.PI * 37}
                strokeDashoffset={Math.PI * 37 * (1 - gaugeValue / 100)}
              />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
              <span className="text-body font-semibold leading-none text-text-primary">
                {gaugeValue}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function StatusBadge({ status }: { status: Sale["status"] }) {
  return (
    <StatusPill
      tone={status === "Pago" ? "accent" : status === "Pendente" ? "warning" : "error"}
    >
      {status}
    </StatusPill>
  );
}

function OriginBadge({ origin }: { origin: Sale["origin"] }) {
  return <StatusPill tone="neutral">{origin}</StatusPill>;
}


export function SalesListPage() {
  const [sales, setSales] = useState<Sale[]>(MOCK_SALES);
  const [originTab, setOriginTab] = useState<string>("Todas");
  const [eventFilter, setEventFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sales.filter((sale) => {
      const originMatch =
        originTab === "Todas" ||
        (originTab === "Importadas" ? sale.origin === "Importada" : sale.origin === originTab);
      const eventMatch = eventFilter === "Todos" || sale.eventName === eventFilter;
      const statusMatch = statusFilter === "Todos" || sale.status === statusFilter;
      const searchMatch =
        !term ||
        sale.buyerName.toLowerCase().includes(term) ||
        sale.buyerWhatsapp.replace(/\D/g, "").includes(term.replace(/\D/g, "") || "\u0000");
      return originMatch && eventMatch && statusMatch && searchMatch;
    });
  }, [sales, originTab, eventFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const metrics = useMemo(() => {
    const paid = filtered.filter((s) => s.status === "Pago");
    const pending = filtered.filter((s) => s.status === "Pendente");
    const revenue = paid.reduce((acc, s) => acc + s.amount, 0);
    const ticketsSold = paid.reduce((acc, s) => acc + s.quantity, 0);
    const avgTicket = paid.length === 0 ? 0 : revenue / paid.length;
    const considered = paid.length + pending.length;
    const pendingRate = considered === 0 ? 0 : Math.round((pending.length / considered) * 100);
    return { revenue, ticketsSold, avgTicket, pendingCount: pending.length, pendingRate };
  }, [filtered]);



  const exportCsv = () => {
    const header = [
      "Comprador",
      "WhatsApp",
      "Evento",
      "Lote",
      "Origem",
      "Quantidade",
      "Valor",
      "Status",
      "Data",
    ];
    const rows = filtered.map((s) => [
      s.buyerName,
      s.buyerWhatsapp,
      s.eventName,
      s.lotName,
      s.origin,
      s.quantity,
      s.amount.toFixed(2).replace(".", ","),
      s.status,
      s.createdAt,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendas.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const generatePdf = () => {
    const scope = filtered.filter((s) => s.status !== "Cancelado");
    const names = scope.flatMap((s) => s.tickets.map((t) => t.participantName));
    if (names.length === 0) {
      toast.error("Nenhum participante para gerar a lista");
      return;
    }
    const eventName = eventFilter === "Todos" ? "Todos os eventos" : eventFilter;
    generateCheckinListPdf(eventName, names);
    toast.success("Lista PDF gerada");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-heading-1 text-text-primary">Vendas</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-accent px-4 py-2.5 text-body font-semibold text-[#111111] transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Nova Venda
        </button>
      </div>

      {/* Mini dashboard */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetricCard
          title="Total vendido no período"
          value={formatCurrency(metrics.revenue)}
          subtext={`${filtered.filter((s) => s.status === "Pago").length} vendas pagas`}
          icon={DollarSign}
          iconColor="text-accent-text"
        />
        <MiniMetricCard
          title="Ingressos vendidos"
          value={String(metrics.ticketsSold)}
          subtext="ingressos confirmados"
          icon={Ticket}
          iconColor="text-info"
        />
        <MiniMetricCard
          title="Ticket médio"
          value={formatCurrency(metrics.avgTicket)}
          subtext="por venda paga"
          icon={Receipt}
          iconColor="text-success"
        />
        <MiniMetricCard
          title="Aguardando Pagamento"
          gaugeValue={metrics.pendingRate}
          subtext={`${metrics.pendingCount} pedidos pendentes`}
          icon={Clock}
          iconColor="text-warning"
        />
      </div>


      {/* Abas de origem */}
      <div className="flex flex-wrap gap-1 border-b border-border-subtle">
        {ORIGIN_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setOriginTab(tab);
              setPage(1);
            }}
            className={cn(
              "rounded-[var(--radius-sm)] border-b-2 px-4 py-2 text-body transition-colors",
              originTab === tab
                ? "border-accent bg-accent-muted text-accent-text"
                : "border-transparent text-text-secondary hover:bg-bg-tertiary",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filtrar por evento"
            className={selectClass}
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="Todos">Todos os eventos</option>
            {EVENTS.map((e) => (
              <option key={e.id} value={e.name}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por status"
            className={selectClass}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "Todos" ? "Todos os status" : s}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-disabled" />
            <input
              aria-label="Buscar por nome ou WhatsApp"
              placeholder="Buscar por nome ou WhatsApp"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-[280px] rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary py-2 pl-9 pr-3 text-body text-text-primary outline-none placeholder:text-text-disabled focus:border-accent"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-4 py-2 text-body text-text-primary transition-colors hover:border-accent"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={generatePdf}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-4 py-2 text-body text-text-primary transition-colors hover:border-accent"
          >
            <FileText className="h-4 w-4" />
            Gerar lista PDF
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary shadow-[var(--shadow-sm)]">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              {[
                "Comprador",
                "WhatsApp",
                "Evento",
                "Lote",
                "Origem",
                "Qtd.",
                "Valor",
                "Status",
                "Data",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-small font-medium text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((sale) => (
              <tr
                key={sale.id}
                className="border-b border-border-subtle last:border-0 transition-colors hover:bg-bg-tertiary"
              >
                <td className="px-4 py-3">
                  <Link
                    to="/admin/vendas/$id"
                    params={{ id: sale.id }}
                    className="text-body text-text-primary hover:text-accent-text"
                  >
                    {sale.buyerName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-small text-text-secondary">{sale.buyerWhatsapp}</td>
                <td className="px-4 py-3 text-small text-text-secondary">{sale.eventName}</td>
                <td className="px-4 py-3 text-small text-text-secondary">{sale.lotName}</td>
                <td className="px-4 py-3">
                  <OriginBadge origin={sale.origin} />
                </td>
                <td className="px-4 py-3 text-small text-text-secondary">{sale.quantity}x</td>
                <td className="px-4 py-3 text-body font-semibold text-text-primary">
                  {formatCurrency(sale.amount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={sale.status} />
                </td>
                <td className="px-4 py-3 text-small text-text-disabled">{sale.createdAt}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-body text-text-secondary">
                  Nenhuma venda encontrada com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-4 sm:flex-row">
        <div className="flex items-center gap-4 text-small text-text-secondary">
          <div className="flex items-center gap-2">
            Mostrar
            <select
              aria-label="Itens por página"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary px-2 py-1 outline-none focus:border-accent"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <span>
            Mostrando {filtered.length === 0 ? 0 : start + 1}–
            {Math.min(start + pageSize, filtered.length)} de {filtered.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-[var(--radius-sm)] border border-border-default p-2 text-text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:text-text-disabled"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-small text-text-secondary">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Próxima página"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-[var(--radius-sm)] border border-border-default p-2 text-text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:text-text-disabled"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ManualSaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={(sale) => setSales((prev) => [sale, ...prev])}
      />
    </div>
  );
}
