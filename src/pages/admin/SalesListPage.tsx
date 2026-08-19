import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, DollarSign, Download, FileText, Receipt, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useSales, formatCurrency } from "@/lib/sales-queries";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { ManualSaleModal } from "@/components/admin/sales/ManualSaleModal";
import {
  DataTable,
  DataTableCell,
  DataTableHeadRow,
  DataTablePagination,
  DataTableRow,
  DataTableShell,
  StatusPill,
} from "@/components/admin/DataTable";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { ListPageHeader, PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { FilterBar, FilterSearch, FilterTabs, filterFieldClass } from "@/components/admin/FilterBar";
import { useAuth } from "@/lib/auth-context";

const ORIGIN_TABS = ["Todas", "TicketFlow", "Manual", "Importadas"] as const;
const STATUS_OPTIONS = ["Todos", "Pago", "Pendente", "Cancelado"] as const;

function StatusBadge({ status }: { status: string }) {
  return (
    <StatusPill
      tone={status === "pago" ? "accent" : status === "pendente" ? "warning" : "error"}
    >
      {status === "pago" ? "Pago" : status === "pendente" ? "Pendente" : "Cancelado"}
    </StatusPill>
  );
}

function OriginBadge({ origin }: { origin: string }) {
  const label = origin === "ticketflow" ? "TicketFlow" : origin === "manual" ? "Manual" : "Importada";
  return <StatusPill tone="neutral">{label}</StatusPill>;
}


export function SalesListPage() {
  const { data: sales = [], isLoading, refetch } = useSales();
  const { userRole } = useAuth();
  const isColab = userRole === "colaborador";
  const [originTab, setOriginTab] = useState<string>("Todas");
  const [eventFilter, setEventFilter] = useState("Todos");
  const { data: stats } = useSalesStats(
    eventFilter === "Todos" 
      ? "overview" 
      : sales.find(s => (s.events as any)?.title === eventFilter)?.event_id
  );

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
        (originTab === "Importadas" ? sale.origin === "importado" : sale.origin === originTab.toLowerCase());
      const eventName = (sale.events as any)?.title || "";
      const eventMatch = eventFilter === "Todos" || eventName === eventFilter;
      const statusMatch = statusFilter === "Todos" || sale.status === statusFilter.toLowerCase();
      const searchMatch =
        !term ||
        sale.buyer_name.toLowerCase().includes(term) ||
        sale.buyer_whatsapp.replace(/\D/g, "").includes(term.replace(/\D/g, "") || "\u0000");
      return originMatch && eventMatch && statusMatch && searchMatch;
    });
  }, [sales, originTab, eventFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const metrics = useMemo(() => {
    const paid = filtered.filter((s) => s.status === "pago");
    const pending = filtered.filter((s) => s.status === "pendente");
    const revenue = paid.reduce((acc, s) => acc + s.total_amount, 0);
    const ticketsSold = stats?.totalTickets || 0;
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
      s.buyer_name,
      s.buyer_whatsapp,
      (s.events as any)?.title || "",
      (s.ticket_batches as any)?.name || "",
      s.origin,
      s.quantity,
      s.total_amount.toFixed(2).replace(".", ","),
      s.status,
      new Date(s.created_at).toLocaleString("pt-BR"),
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
    const scope = filtered.filter((s) => s.status !== "cancelado");
    // Em um sistema real, precisaríamos buscar os nomes dos participantes de cada ingresso da venda
    // Por enquanto, usaremos o nome do comprador se não tivermos os participantes
    const names = scope.map((s) => s.buyer_name);
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
      <ListPageHeader
        title="Vendas"
        action={
          !isColab && (
            <PrimaryActionButton onClick={() => setModalOpen(true)}>Nova Venda</PrimaryActionButton>
          )
        }
      />

      {/* Mini dashboard */}
      <MiniMetricGrid>
        <MiniMetricCard
          title="Total vendido no período"
          value={formatCurrency(metrics.revenue)}
          subtext={`${filtered.filter((s) => s.status === "pago").length} vendas pagas`}
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
      </MiniMetricGrid>


      {/* Abas de origem */}
      <FilterTabs
        tabs={[...ORIGIN_TABS]}
        value={originTab}
        onChange={(tab) => {
          setOriginTab(tab);
          setPage(1);
        }}
      />

      {/* Filtros */}
      <FilterBar
        actions={
          !isColab && (
            <>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-10 w-full items-center justify-center gap-2 border border-border-default bg-bg-tertiary px-4 text-body text-text-primary transition-colors hover:border-accent rounded-[var(--radius-sm)] md:w-auto"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={generatePdf}
                className="inline-flex h-10 w-full items-center justify-center gap-2 border border-border-default bg-bg-tertiary px-4 text-body text-text-primary transition-colors hover:border-accent rounded-[var(--radius-sm)] md:w-auto"
              >
                <FileText className="h-4 w-4" />
                Gerar lista PDF
              </button>
            </>
          )
        }
      >
        <select
          aria-label="Filtrar por evento"
          className={filterFieldClass}
          value={eventFilter}
          onChange={(e) => {
            setEventFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="Todos">Todos os eventos</option>
          {Array.from(new Map(sales.map(s => [(s.events as any)?.title, s.event_id]).filter(Boolean))).map(([title, id]: any) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por status"
          className={filterFieldClass}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st === "Todos" ? "Todos os status" : st}
            </option>
          ))}
        </select>

        <FilterSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por nome ou WhatsApp"
        />
      </FilterBar>

      {/* Tabela */}
      <DataTableShell>
        <DataTable className="min-w-[980px]">
          <DataTableHeadRow
            columns={[
              "Comprador",
              "WhatsApp",
              "Evento",
              "Lote",
              "Origem",
              "Qtd.",
              "Valor",
              "Status",
              "Data",
            ]}
          />
          <tbody>
            {pageRows.map((sale) => (
              <DataTableRow key={sale.id}>
                <DataTableCell variant="primary">
                  <Link
                    to="/admin/vendas/$id"
                    params={{ id: sale.id }}
                    className="hover:text-accent-text"
                  >
                    {sale.buyer_name}
                  </Link>
                </DataTableCell>
                <DataTableCell>{sale.buyer_whatsapp}</DataTableCell>
                <DataTableCell>{(sale.events as any)?.title}</DataTableCell>
                <DataTableCell>{(sale.ticket_batches as any)?.name}</DataTableCell>
                <DataTableCell>
                  <OriginBadge origin={sale.origin} />
                </DataTableCell>
                <DataTableCell>{sale.quantity}x</DataTableCell>
                <DataTableCell variant="strong">{formatCurrency(sale.total_amount)}</DataTableCell>
                <DataTableCell>
                  <StatusBadge status={sale.status} />
                </DataTableCell>
                <DataTableCell variant="muted">{new Date(sale.created_at).toLocaleDateString("pt-BR")}</DataTableCell>
              </DataTableRow>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <DataTableCell colSpan={9} className="py-10 text-center text-body">
                  Nenhuma venda encontrada com os filtros atuais.
                </DataTableCell>
              </tr>
            )}
          </tbody>
        </DataTable>
      </DataTableShell>

      {/* Paginação */}
      <DataTablePagination
        pageSize={pageSize}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        startIndex={start}
        onPageChange={setPage}
      />

      <ManualSaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={() => refetch()}
      />
    </div>
  );
}
