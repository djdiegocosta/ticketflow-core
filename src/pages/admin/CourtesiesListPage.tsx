import * as React from "react";
import { Download, Gift, CheckCircle, Loader2 } from "lucide-react";
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
import { formatName } from "@/lib/form-format";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { toast } from "sonner";
import { Suspense, lazy } from "react";
import { useCourtesies } from "@/lib/sales-queries";
import { useEvents } from "@/lib/events-queries";
import { useQueryClient } from "@tanstack/react-query";
import { useCourtesiesStats } from "@/lib/sales-queries";

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
          <DataTableHeadRow columns={isMobile ? ["Convidado", "Data", "Status"] : ["Convidado", "Evento", "Data de emissão", "Status"]} />
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <DataTableCell colSpan={isMobile ? 3 : 4} className="py-10 text-center text-body">
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
                  </DataTableRow>
                );
              })
            )}
          </tbody>
        </DataTable>
      </DataTableShell>

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
