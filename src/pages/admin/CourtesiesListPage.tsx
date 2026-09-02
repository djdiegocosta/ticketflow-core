import * as React from "react";
import { Download, Gift, CheckCircle, Loader2, Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableHeadRow, DataTableRow, DataTableCell, DataTablePagination, DataTableShell, StatusPill } from "@/components/admin/DataTable";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { FilterSearch } from "@/components/admin/FilterBar";
import { formatName, isFullName } from "@/lib/form-format";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { toast } from "sonner";
import { Suspense, lazy } from "react";
import { useCourtesies } from "@/lib/sales-queries";
import { getOperationalEvent, useEvents } from "@/lib/events-queries";
import { useAdminPageAction } from "@/components/layouts/AdminPageActionContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CreateCourtesyPanelLazy = lazy(() => import("@/components/admin/cortesias/CreateCourtesyPanel").then(m => ({ default: m.CreateCourtesyPanel })));

export function CourtesiesListPage() {
  const { data: courtesies = [], isLoading } = useCourtesies();
  const { data: events = [] } = useEvents();
  const queryClient = useQueryClient();
  const operationalEvent = getOperationalEvent(events);
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [pageSize, setPageSize] = React.useState("25");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isMobile, setIsMobile] = React.useState(false);
  const [editingTicket, setEditingTicket] = React.useState<any>(null);
  const [newName, setNewName] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  useAdminPageAction(<PrimaryActionButton onClick={() => setIsPanelOpen(true)}>Nova Cortesia</PrimaryActionButton>);

  React.useEffect(() => { const checkMobile = () => setIsMobile(window.innerWidth < 768); checkMobile(); window.addEventListener("resize", checkMobile); return () => window.removeEventListener("resize", checkMobile); }, []);

  const filteredData = React.useMemo(() => (courtesies as any[]).filter((item) => {
    const eventMatch = !operationalEvent || item.sales?.event_id === operationalEvent.id;
    return eventMatch && item.participant_name.toLowerCase().includes(search.toLowerCase());
  }), [courtesies, search, operationalEvent]);

  const totalCortesias = filteredData.length;
  const totalCheckins = filteredData.filter((item: any) => !!item.checked_in_at || item.status === "utilizado").length;
  const paginatedData = React.useMemo(() => { const size = parseInt(pageSize); const start = (currentPage - 1) * size; return filteredData.slice(start, start + size); }, [filteredData, currentPage, pageSize]);
  const totalPages = Math.ceil(filteredData.length / parseInt(pageSize));
  const handleExportPdf = () => { const names = filteredData.map((c: any) => c.participant_name); generateCheckinListPdf(operationalEvent?.title ?? "Todos os eventos", names); toast.success("PDF gerado com sucesso!"); };
  const handleCreateSuccess = () => { queryClient.invalidateQueries({ queryKey: ["tickets", "courtesies"] }); toast.success("Cortesias emitidas com sucesso!"); setIsPanelOpen(false); };
  const size = parseInt(pageSize); const startIndex = (currentPage - 1) * size;

  if (isLoading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return <div className="w-full max-w-full space-y-6 overflow-hidden">
    <MiniMetricGrid className="xl:grid-cols-2"><MiniMetricCard icon={Gift} iconColor="text-accent-text" title="Total de cortesias" value={totalCortesias} subtext={operationalEvent ? `no evento ${operationalEvent.title}` : "em todos os eventos"} /><MiniMetricCard icon={CheckCircle} iconColor="text-success" title="Check-ins de cortesias" value={totalCheckins} subtext="convidados presentes" /></MiniMetricGrid>
    <div className="flex min-w-0 items-center gap-2"><FilterSearch value={search} onChange={(v) => { setSearch(v); setCurrentPage(1); }} placeholder="Buscar convidado..." /><div className="flex shrink-0 items-center gap-2"><TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={handleExportPdf} className="h-9 gap-2 rounded-[var(--radius-sm)] bg-accent px-3 text-body font-semibold text-[#111111] hover:bg-accent-hover"><Download className="h-4 w-4" /><span className="hidden sm:inline">PDF</span></Button></TooltipTrigger><TooltipContent>Gerar lista PDF</TooltipContent></Tooltip></TooltipProvider></div></div>
    <DataTableShell><DataTable className={isMobile ? "min-w-full" : "min-w-[720px]"}><DataTableHeadRow columns={isMobile ? ["Convidado", "Data", "Status"] : ["Convidado", "Evento", "Data de emissão", "Status", <span className="block text-right">Ações</span>]} /><tbody>
      {paginatedData.length === 0 ? <tr><DataTableCell colSpan={isMobile ? 3 : 5} className="py-10 text-center text-body">Nenhuma cortesia encontrada.</DataTableCell></tr> : paginatedData.map((item: any) => { const isCheckedIn = !!item.checked_in_at || item.status === "utilizado"; return <DataTableRow key={item.id}><DataTableCell variant="primary">{formatName(item.participant_name)}</DataTableCell>{!isMobile && <DataTableCell>{item.sales?.events?.title || "—"}</DataTableCell>}<DataTableCell variant="muted">{new Date(item.created_at).toLocaleDateString("pt-BR")}</DataTableCell><DataTableCell><StatusPill tone={isCheckedIn ? "accent" : "neutral"}>{isCheckedIn ? "Utilizado" : "Não utilizado"}</StatusPill></DataTableCell>{!isMobile && <DataTableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Ações de ${item.participant_name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary">{isDeleting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <MoreHorizontal className="h-4 w-4" />}</button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={() => { setEditingTicket(item); setNewName(item.participant_name); }}><Edit2 className="mr-2 h-4 w-4" />Editar nome</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem disabled={isCheckedIn || isDeleting} onClick={async () => { if (!window.confirm(`Excluir cortesia de "${item.participant_name}"?`)) return; setIsDeleting(true); try { const { error } = await supabase.rpc("delete_courtesy_ticket", { _ticket_id: item.id }); if (error) throw error; toast.success("Cortesia excluída"); queryClient.invalidateQueries({ queryKey: ["tickets", "courtesies"] }); } catch (err: any) { toast.error("Erro ao excluir: " + err.message); } finally { setIsDeleting(false); } }} className="text-error focus:text-error">{isCheckedIn ? <><Trash2 className="mr-2 h-4 w-4" />Não é possível excluir (já utilizada)</> : <><Trash2 className="mr-2 h-4 w-4" />Excluir cortesia</>}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></DataTableCell>}</DataTableRow>; })}
    </tbody></DataTable></DataTableShell>
    {editingTicket && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-6"><div className="w-full max-w-[420px] border border-border-subtle bg-bg-primary p-6 shadow-[var(--shadow-lg)]"><h3 className="text-heading-2 text-text-primary">Editar nome do convidado</h3><div className="mt-4"><label className="text-small font-medium text-text-secondary">Nome completo</label><input type="text" autoFocus value={newName} onChange={(e) => setNewName(formatName(e.target.value))} className="mt-1 w-full border border-border-default bg-bg-secondary px-3 py-2 outline-none focus:border-accent" />{newName && !isFullName(newName) && <p className="mt-1 text-[10px] text-error">Mínimo 2 palavras</p>}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditingTicket(null)} className="border border-border-default bg-bg-tertiary px-4 py-2 text-body text-text-primary hover:border-accent">Cancelar</button><button type="button" disabled={isUpdating || !isFullName(newName)} onClick={async () => { setIsUpdating(true); try { const { error } = await supabase.rpc("update_courtesy_participant", { _ticket_id: editingTicket.id, _name: newName }); if (error) throw error; toast.success("Nome atualizado"); queryClient.invalidateQueries({ queryKey: ["tickets", "courtesies"] }); setEditingTicket(null); } catch (err: any) { toast.error("Erro ao atualizar: " + err.message); } finally { setIsUpdating(false); } }} className="bg-accent px-4 py-2 text-body font-semibold text-[#111111] hover:opacity-90 disabled:opacity-50">{isUpdating ? "Salvando..." : "Salvar"}</button></div></div></div>}
    <DataTablePagination pageSize={size} onPageSizeChange={(n) => { setPageSize(String(n)); setCurrentPage(1); }} currentPage={currentPage} totalPages={Math.max(1, totalPages)} totalItems={filteredData.length} startIndex={startIndex} onPageChange={setCurrentPage} />
    <Suspense fallback={null}>{isPanelOpen && <CreateCourtesyPanelLazy open={isPanelOpen} onOpenChange={setIsPanelOpen} onSuccess={handleCreateSuccess} />}</Suspense>
  </div>;
}
