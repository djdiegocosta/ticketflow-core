import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Ban, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useSales, formatCurrency } from "@/lib/sales-queries";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { ManualSaleModal } from "@/components/admin/sales/ManualSaleModal";
import { supabase } from "@/integrations/supabase/client";
import {
  DataTable,
  DataTableCell,
  DataTableHeadRow,
  DataTablePagination,
  DataTableRow,
  DataTableShell,
  StatusPill,
} from "@/components/admin/DataTable";
import { FilterBar, FilterSearch, FilterTabs, FilterSelect, FilterExportButton } from "@/components/admin/FilterBar";
import { PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { useAuth } from "@/lib/auth-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ORIGIN_TABS = ["Todas", "TicketFlow", "Manual", "Importadas"] as const;
const STATUS_TABS = ["Todos", "Pago", "Pendente", "Expirado", "Cancelado"] as const;

function StatusBadge({ sale }: { sale: any }) {
  if (sale.is_courtesy) return <StatusPill tone="warning">Cortesia</StatusPill>;
  return (
    <StatusPill tone={sale.status === "pago" ? "accent" : sale.status === "pendente" ? "warning" : sale.status === "expirado" ? "neutral" : "error"}>
      {sale.status === "pago" ? "Pago" : sale.status === "pendente" ? "Pendente" : sale.status === "expirado" ? "Expirado" : "Cancelado"}
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
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [eventFilter, setEventFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancellingSale, setCancellingSale] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sales.filter((sale) => {
      const originMatch = originTab === "Todas" || (originTab === "Importadas" ? sale.origin === "importado" : sale.origin === originTab.toLowerCase());
      const eventName = (sale.events as any)?.title || "";
      const eventMatch = eventFilter === "Todos" || eventName === eventFilter;
      const statusMatch = statusFilter === "Todos" || sale.status === statusFilter.toLowerCase();
      const normalizedPhone = sale.buyer_whatsapp.replace(/\D/g, "");
      const searchMatch = !term || sale.buyer_name.toLowerCase().includes(term) || normalizedPhone.includes(term.replace(/\D/g, "")) || (sale.sale_code || "").toLowerCase().includes(term);
      return originMatch && eventMatch && statusMatch && searchMatch;
    });
  }, [sales, originTab, eventFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const exportCsv = () => {
    const header = ["Comprador", "WhatsApp", "Evento", "Lote", "Origem", "Quantidade", "Valor", "Status", "Data"];
    const rows = filtered.map((s) => [s.buyer_name, s.buyer_whatsapp, (s.events as any)?.title || "", (s.ticket_batches as any)?.name || "", s.origin, s.quantity, s.total_amount.toFixed(2).replace(".", ","), s.status, new Date(s.created_at).toLocaleString("pt-BR")]);
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
    const names = filtered.filter((s) => s.status !== "cancelado").map((s) => s.buyer_name);
    if (names.length === 0) {
      toast.error("Nenhum participante para gerar a lista");
      return;
    }
    generateCheckinListPdf(eventFilter === "Todos" ? "Todos os eventos" : eventFilter, names);
    toast.success("Lista PDF gerada");
  };

  const handleCancelSale = async (sale: any) => {
    if (!window.confirm(`Cancelar a venda de "${sale.buyer_name}"?`)) return;
    setCancellingSale(sale.id);
    try {
      const { error } = await supabase.rpc("cancel_sale", { _sale_id: sale.id });
      if (error) throw error;
      toast.success("Venda cancelada com sucesso");
      await refetch();
    } catch (err: any) {
      toast.error("Erro ao cancelar venda: " + (err.message || "Tente novamente."));
    } finally {
      setCancellingSale(null);
    }
  };

  return (
    <div className="space-y-5">
      <FilterBar
        actions={
          <div className="flex items-center gap-2">
            {!isColab && <FilterExportButton onExportCsv={exportCsv} onGeneratePdf={generatePdf} />}
            {!isColab && <PrimaryActionButton onClick={() => setModalOpen(true)}>Nova Venda</PrimaryActionButton>}
          </div>
        }
      >
        <FilterSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por cliente ou código da venda" />
        <div className="hidden lg:block shrink-0">
          <FilterTabs
            tabs={[...STATUS_TABS]}
            value={statusFilter}
            onChange={(tab) => { setStatusFilter(tab); setPage(1); }}
          />
        </div>
      </FilterBar>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs tabs={[...ORIGIN_TABS]} value={originTab} onChange={(tab) => { setOriginTab(tab); setPage(1); }} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="lg:hidden">
            <FilterTabs tabs={[...STATUS_TABS]} value={statusFilter} onChange={(tab) => { setStatusFilter(tab); setPage(1); }} />
          </div>
          <FilterSelect aria-label="Filtrar por evento" value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}>
            <option value="Todos">Todos os eventos</option>
            {Array.from(new Set(sales.map((s) => (s.events as any)?.title).filter(Boolean))).map((name: any) => <option key={name} value={name}>{name}</option>)}
          </FilterSelect>
        </div>
      </div>

      <DataTableShell>
        <DataTable className="min-w-[1080px]">
          <DataTableHeadRow columns={["Cliente", "WhatsApp", "Evento", "Lote", "Origem", "Ingressos", "Valor", "Status", "Data", "Ações"]} />
          <tbody>
            {pageRows.map((sale) => {
              const canCancel = sale.status !== "cancelado" && sale.status !== "reembolsado" && !sale.is_courtesy;
              return (
                <DataTableRow key={sale.id}>
                  <DataTableCell variant="primary">
                    <div className="min-w-0">
                      <Link to="/admin/vendas/$id" params={{ id: sale.id }} className="block truncate hover:text-accent-text">{sale.buyer_name}</Link>
                      {sale.sale_code && <span className="font-mono-token text-text-disabled">{sale.sale_code}</span>}
                    </div>
                  </DataTableCell>
                  <DataTableCell>{sale.buyer_whatsapp}</DataTableCell>
                  <DataTableCell>{(sale.events as any)?.title || "—"}</DataTableCell>
                  <DataTableCell>{(sale.ticket_batches as any)?.name || "—"}</DataTableCell>
                  <DataTableCell><OriginBadge origin={sale.origin} /></DataTableCell>
                  <DataTableCell>{sale.quantity}x</DataTableCell>
                  <DataTableCell variant="strong">{formatCurrency(sale.total_amount)}</DataTableCell>
                  <DataTableCell><StatusBadge sale={sale} /></DataTableCell>
                  <DataTableCell variant="muted">{new Date(sale.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</DataTableCell>
                  <DataTableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" aria-label={`Ações da venda de ${sale.buyer_name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary">
                          {cancellingSale === sale.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <MoreHorizontal className="h-4 w-4" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/vendas/$id" params={{ id: sale.id }}><Eye className="mr-2 h-4 w-4" />Visualizar</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={!canCancel || cancellingSale === sale.id} onClick={() => handleCancelSale(sale)} className="text-error focus:text-error">
                          <Ban className="mr-2 h-4 w-4" />{sale.status === "cancelado" ? "Venda cancelada" : "Cancelar venda"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </DataTableCell>
                </DataTableRow>
              );
            })}
            {pageRows.length === 0 && <tr><DataTableCell colSpan={10} className="py-10 text-center text-body">{isLoading ? "Carregando vendas..." : "Nenhuma venda encontrada com os filtros atuais."}</DataTableCell></tr>}
          </tbody>
        </DataTable>
      </DataTableShell>

      <DataTablePagination pageSize={pageSize} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} startIndex={start} onPageChange={setPage} />
      <ManualSaleModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={() => refetch()} />
    </div>
  );
}
