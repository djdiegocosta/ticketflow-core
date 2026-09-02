import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Ban, Download, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useSales, formatCurrency } from "@/lib/sales-queries";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { ManualSaleModal } from "@/components/admin/sales/ManualSaleModal";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, DataTableCell, DataTableHeadRow, DataTablePagination, DataTableRow, DataTableShell, StatusPill } from "@/components/admin/DataTable";
import { FilterBar, FilterSearch, FilterTabs } from "@/components/admin/FilterBar";
import { PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { useAuth } from "@/lib/auth-context";
import { getOperationalEvent, useEvents } from "@/lib/events-queries";
import { useAdminPageAction } from "@/components/layouts/AdminPageActionContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const STATUS_TABS = ["Todos", "Pago", "Pendente", "Expirado", "Cancelado"] as const;

function StatusBadge({ sale }: { sale: any }) {
  if (sale.is_courtesy) return <StatusPill tone="warning">Cortesia</StatusPill>;
  return <StatusPill tone={sale.status === "pago" ? "accent" : sale.status === "pendente" ? "warning" : sale.status === "expirado" ? "neutral" : "error"}>{sale.status === "pago" ? "Pago" : sale.status === "pendente" ? "Pendente" : sale.status === "expirado" ? "Expirado" : "Cancelado"}</StatusPill>;
}

export function SalesListPage() {
  const { data: sales = [], isLoading, refetch } = useSales();
  const { data: events = [] } = useEvents();
  const { userRole } = useAuth();
  const isColab = userRole === "colaborador";
  const operationalEvent = getOperationalEvent(events);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancellingSale, setCancellingSale] = useState<string | null>(null);

  useAdminPageAction(!isColab ? <PrimaryActionButton onClick={() => setModalOpen(true)}>Nova Venda</PrimaryActionButton> : null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sales.filter((sale) => {
      const eventMatch = !operationalEvent || sale.event_id === operationalEvent.id;
      const statusMatch = statusFilter === "Todos" || sale.status === statusFilter.toLowerCase();
      const normalizedPhone = sale.buyer_whatsapp.replace(/\D/g, "");
      const searchMatch = !term || sale.buyer_name.toLowerCase().includes(term) || normalizedPhone.includes(term.replace(/\D/g, "")) || (sale.sale_code || "").toLowerCase().includes(term);
      return eventMatch && statusMatch && searchMatch;
    });
  }, [sales, operationalEvent, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const generatePdf = () => {
    const names = filtered.filter((s) => s.status !== "cancelado").map((s) => s.buyer_name);
    if (names.length === 0) { toast.error("Nenhum participante para gerar a lista"); return; }
    generateCheckinListPdf(operationalEvent?.title ?? "Todos os eventos", names); toast.success("Lista PDF gerada");
  };

  const handleCancelSale = async (sale: any) => {
    if (!window.confirm(`Cancelar a venda de "${sale.buyer_name}"?`)) return;
    setCancellingSale(sale.id);
    try { const { error } = await supabase.rpc("cancel_sale", { _sale_id: sale.id }); if (error) throw error; toast.success("Venda cancelada com sucesso"); await refetch(); }
    catch (err: any) { toast.error("Erro ao cancelar venda: " + (err.message || "Tente novamente.")); }
    finally { setCancellingSale(null); }
  };

  return <div className="space-y-5">
    <FilterBar actions={!isColab ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={generatePdf}
              className="h-9 shrink-0 gap-2 rounded-[var(--radius-sm)] bg-accent px-3 text-body font-semibold leading-none text-[#111111] hover:bg-accent-hover"
            >
              <Download className="h-4 w-4" />
              <span>PDF</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Gerar lista PDF</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : undefined}>
      <FilterSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por cliente ou código da venda" />
      <div className="hidden lg:block shrink-0"><FilterTabs tabs={[...STATUS_TABS]} value={statusFilter} onChange={(tab) => { setStatusFilter(tab); setPage(1); }} /></div>
    </FilterBar>
    <div className="lg:hidden"><FilterTabs tabs={[...STATUS_TABS]} value={statusFilter} onChange={(tab) => { setStatusFilter(tab); setPage(1); }} /></div>
    <DataTableShell><DataTable className="min-w-[1000px]"><DataTableHeadRow columns={["Cliente", "WhatsApp", "Evento", "Lote", "Ingressos", "Valor", "Status", "Data", "Ações"]} /><tbody>
      {pageRows.map((sale) => { const canCancel = sale.status !== "cancelado" && sale.status !== "reembolsado" && !sale.is_courtesy; return <DataTableRow key={sale.id}><DataTableCell variant="primary"><div className="min-w-0"><Link to="/admin/vendas/$id" params={{ id: sale.id }} className="block truncate hover:text-accent-text">{sale.buyer_name}</Link>{sale.sale_code && <span className="font-mono-token text-text-disabled">{sale.sale_code}</span>}</div></DataTableCell><DataTableCell>{sale.buyer_whatsapp}</DataTableCell><DataTableCell>{(sale.events as any)?.title || "—"}</DataTableCell><DataTableCell>{(sale.ticket_batches as any)?.name || "—"}</DataTableCell><DataTableCell>{sale.quantity}x</DataTableCell><DataTableCell variant="strong">{formatCurrency(sale.total_amount)}</DataTableCell><DataTableCell><StatusBadge sale={sale} /></DataTableCell><DataTableCell variant="muted">{new Date(sale.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</DataTableCell><DataTableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Ações da venda de ${sale.buyer_name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary">{cancellingSale === sale.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <MoreHorizontal className="h-4 w-4" />}</button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44"><DropdownMenuItem asChild><Link to="/admin/vendas/$id" params={{ id: sale.id }}><Eye className="mr-2 h-4 w-4" />Visualizar</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem disabled={!canCancel || cancellingSale === sale.id} onClick={() => handleCancelSale(sale)} className="text-error focus:text-error"><Ban className="mr-2 h-4 w-4" />{sale.status === "cancelado" ? "Venda cancelada" : "Cancelar venda"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></DataTableCell></DataTableRow>; })}
      {pageRows.length === 0 && <tr><DataTableCell colSpan={9} className="py-10 text-center text-body">{isLoading ? "Carregando vendas..." : "Nenhuma venda encontrada."}</DataTableCell></tr>}
    </tbody></DataTable></DataTableShell>
    <DataTablePagination pageSize={pageSize} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} startIndex={start} onPageChange={setPage} />
    <ManualSaleModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={() => refetch()} />
  </div>;
}
