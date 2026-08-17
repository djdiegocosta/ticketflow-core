import * as React from "react";
import { Download, Gift, CheckCircle, Loader2, Edit2, Trash2 } from "lucide-react";
import {
  DataTable,
  DataTableHeadRow,
  DataTableRow,
  DataTableCell,
  DataTablePagination,
  DataTableShell,
  StatusPill,
} from "@/components/admin/DataTable";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { ListPageHeader, PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { FilterBar, FilterSearch, filterFieldClass } from "@/components/admin/FilterBar";
import { formatName, isFullName } from "@/lib/form-format";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { toast } from "sonner";
import { Suspense, lazy } from "react";
import { useCourtesies, useCourtesiesStats } from "@/lib/sales-queries";
import { useEvents } from "@/lib/events-queries";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CreateCourtesyPanelLazy = lazy(() => 
  import("@/components/admin/cortesias/CreateCourtesyPanel").then(m => ({ default: m.CreateCourtesyPanel }))
);

export function CourtesiesListPage() {
  const { data: courtesies = [], isLoading } = useCourtesies();
  const { data: stats } = useCourtesiesStats();
  const { data: events = [] } = useEvents();
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [eventFilter, setEventFilter] = React.useState("todos");
  const [pageSize, setPageSize] = React.useState("25");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isMobile, setIsMobile] = React.useState(false);
  const [editingTicket, setEditingTicket] = React.useState<any>(null);
  const [newName, setNewName] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredData = React.useMemo(() => {
    return (courtesies as any[]).filter((item) => {
      const eventTitle = item.sales?.events?.title || "";
      const matchesSearch = item.participant_name.toLowerCase().includes(search.toLowerCase());
      const matchesEvent = eventFilter === "todos" || eventTitle === eventFilter;
      return matchesSearch && matchesEvent;
    });
  }, [courtesies, search, eventFilter]);

  const totalCortesias = stats?.total || 0;
  const totalCheckins = stats?.checkins || 0;

  const paginatedData = React.useMemo(() => {
    const size = parseInt(pageSize);
    const start = (currentPage - 1) * size;
    return filteredData.slice(start, start + size);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / parseInt(pageSize));

  const handleExportPdf = () => {
    const eventName = eventFilter === "todos" ? "Todas as Cortesias" : eventFilter;
    const names = filteredData.map((c: any) => c.participant_name);
    generateCheckinListPdf(eventName, names);
    toast.success("PDF gerado com sucesso!");
  };

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["tickets", "courtesies"] });
    toast.success(`Cortesias emitidas com sucesso!`);
    setIsPanelOpen(false);
  };

  const size = parseInt(pageSize);
  const startIndex = (currentPage - 1) * size;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <ListPageHeader
        title="Cortesias"
        action={
          <PrimaryActionButton onClick={() => setIsPanelOpen(true)}>
            Nova Cortesia
          </PrimaryActionButton>
        }
      />

      <MiniMetricGrid className="xl:grid-cols-2">
        <MiniMetricCard
          icon={Gift}
          iconColor="text-accent-text"
          title="Total de cortesias"
          value={totalCortesias}
          subtext="cortesias emitidas"
        />
        <MiniMetricCard
          icon={CheckCircle}
          iconColor="text-success"
          title="Check-ins de cortesias"
          value={totalCheckins}
          subtext="convidados presentes"
        />
      </MiniMetricGrid>

      <FilterBar
        actions={
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex h-10 w-full items-center justify-center gap-2 border border-border-default bg-bg-tertiary px-4 text-body text-text-primary transition-colors hover:border-accent md:w-auto"
          >
            <Download className="h-4 w-4" />
            Gerar lista PDF
          </button>
        }
      >
        <select
          aria-label="Filtrar por evento"
          className={filterFieldClass}
          value={eventFilter}
          onChange={(e) => {
            setEventFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="todos">Todos os eventos</option>
          {events.map((e: any) => (
            <option key={e.id} value={e.title}>{e.title}</option>
          ))}
        </select>

        <FilterSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setCurrentPage(1);
          }}
          placeholder="Buscar convidado..."
        />
      </FilterBar>

      <DataTableShell>
        <DataTable className={isMobile ? "min-w-full" : "min-w-[720px]"}>
          <DataTableHeadRow columns={isMobile ? ["Convidado", "Data", "Status"] : ["Convidado", "Evento", "Data de emissão", "Status", "Ações"]} />
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <DataTableCell colSpan={isMobile ? 3 : 5} className="py-10 text-center text-body">
                  Nenhuma cortesia encontrada.
                </DataTableCell>
              </tr>
            ) : (
              paginatedData.map((item: any) => {
                const isCheckedIn = !!item.checked_in_at || item.status === 'utilizado';
                const checkinStatusLabel = isCheckedIn ? "Utilizado" : "Não utilizado";
                const eventTitle = item.sales?.events?.title || "—";

                return (
                  <DataTableRow key={item.id}>
                    <DataTableCell variant="primary">{formatName(item.participant_name)}</DataTableCell>
                    {!isMobile && <DataTableCell>{eventTitle}</DataTableCell>}
                    <DataTableCell variant="muted">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusPill tone={isCheckedIn ? "accent" : "neutral"}>
                        {checkinStatusLabel}
                      </StatusPill>
                    </DataTableCell>
                    {!isMobile && (
                      <DataTableCell>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTicket(item);
                              setNewName(item.participant_name);
                            }}
                            className="p-1 text-text-secondary hover:text-accent transition-colors"
                            title="Editar nome"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isCheckedIn || isDeleting}
                            onClick={async () => {
                              if (!window.confirm(`Excluir cortesia de "${item.participant_name}"?`)) return;
                              setIsDeleting(true);
                              try {
                                const { error } = await supabase.rpc("delete_courtesy_ticket", {
                                  _ticket_id: item.id
                                });
                                if (error) throw error;
                                toast.success("Cortesia excluída");
                                queryClient.invalidateQueries({ queryKey: ["tickets", "courtesies"] });
                              } catch (err: any) {
                                toast.error("Erro ao excluir: " + err.message);
                              } finally {
                                setIsDeleting(false);
                              }
                            }}
                            className="p-1 text-text-secondary hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isCheckedIn ? "Não é possível excluir cortesia já utilizada" : "Excluir cortesia"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </DataTableCell>
                    )}
                  </DataTableRow>
                );
              })
            )}
          </tbody>
        </DataTable>
      </DataTableShell>

      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-6">
          <div className="w-full max-w-[420px] border border-border-subtle bg-bg-primary p-6 shadow-[var(--shadow-lg)]">
            <h3 className="text-heading-2 text-text-primary">Editar nome do convidado</h3>
            <div className="mt-4">
              <label className="text-small font-medium text-text-secondary">Nome completo</label>
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(formatName(e.target.value))}
                className="mt-1 w-full border border-border-default bg-bg-secondary px-3 py-2 outline-none focus:border-accent"
              />
              {newName && !isFullName(newName) && (
                <p className="mt-1 text-[10px] text-error">Mínimo 2 palavras</p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="border border-border-default bg-bg-tertiary px-4 py-2 text-body text-text-primary hover:border-accent"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isUpdating || !isFullName(newName)}
                onClick={async () => {
                  setIsUpdating(true);
                  try {
                    const { error } = await supabase.rpc("update_courtesy_participant", {
                      _ticket_id: editingTicket.id,
                      _name: newName
                    });
                    if (error) throw error;
                    toast.success("Nome atualizado");
                    queryClient.invalidateQueries({ queryKey: ["tickets", "courtesies"] });
                    setEditingTicket(null);
                  } catch (err: any) {
                    toast.error("Erro ao atualizar: " + err.message);
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                className="bg-accent px-4 py-2 text-body font-semibold text-[#111111] hover:opacity-90 disabled:opacity-50"
              >
                {isUpdating ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DataTablePagination
        pageSize={size}
        onPageSizeChange={(n) => {
          setPageSize(String(n));
          setCurrentPage(1);
        }}
        currentPage={currentPage}
        totalPages={Math.max(1, totalPages)}
        totalItems={filteredData.length}
        startIndex={startIndex}
        onPageChange={setCurrentPage}
      />

      <Suspense fallback={null}>
        {isPanelOpen && (
          <CreateCourtesyPanelLazy
            open={isPanelOpen}
            onOpenChange={setIsPanelOpen}
            onSuccess={handleCreateSuccess}
          />
        )}
      </Suspense>
    </div>
  );
}
