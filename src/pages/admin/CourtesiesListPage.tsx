import * as React from "react";
import { Download, Gift, CheckCircle } from "lucide-react";
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
import { MOCK_COURTESIES, Courtesy } from "@/lib/courtesies-data";
import { formatName } from "@/lib/form-format";

import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { CreateCourtesyPanel } from "@/components/admin/cortesias/CreateCourtesyPanel";
import { toast } from "sonner";
import { Suspense, lazy } from "react";

const CreateCourtesyPanelLazy = lazy(() => 
  import("@/components/admin/cortesias/CreateCourtesyPanel").then(m => ({ default: m.CreateCourtesyPanel }))
);

export function CourtesiesListPage() {
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
    return MOCK_COURTESIES.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesEvent = eventFilter === "todos" || item.event === eventFilter;
      return matchesSearch && matchesEvent;
    });
  }, [search, eventFilter]);

  const totalCortesias = filteredData.length;
  const totalCheckins = filteredData.filter((c) => c.checkinStatus === "Realizado").length;

  const paginatedData = React.useMemo(() => {
    const size = parseInt(pageSize);
    const start = (currentPage - 1) * size;
    return filteredData.slice(start, start + size);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / parseInt(pageSize));

  const handleExportPdf = () => {
    const eventName = eventFilter === "todos" ? "Todas as Cortesias" : eventFilter;
    const names = filteredData.map((c) => c.name);
    generateCheckinListPdf(eventName, names);
    toast.success("PDF gerado com sucesso!");
  };

  const handleCreateSuccess = (count: number) => {
    toast.success(`${count} cortesias emitidas com sucesso!`);
    // In a real app, we would refetch here.
  };

  const size = parseInt(pageSize);
  const startIndex = (currentPage - 1) * size;

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <ListPageHeader
        title="Cortesias"
        action={
          <PrimaryActionButton onClick={() => setIsPanelOpen(true)}>
            Nova Cortesia
          </PrimaryActionButton>
        }
      />

      {/* Mini Dashboard */}
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

      {/* Filtros */}
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
          <option value="Show de Rock 2024">Show de Rock 2024</option>
          <option value="Festival de Jazz">Festival de Jazz</option>
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

      {/* Tabela */}
      <DataTableShell>
        <DataTable className={isMobile ? "min-w-full" : "min-w-[720px]"}>
          <DataTableHeadRow columns={isMobile ? ["Convidado", "Data", "Status"] : ["Convidado", "Evento", "Data de emissão", "Status"]} />
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <DataTableCell colSpan={4} className="py-10 text-center text-body">
                  Nenhuma cortesia encontrada.
                </DataTableCell>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <DataTableRow key={item.id}>
                  <DataTableCell variant="primary">{formatName(item.name)}</DataTableCell>
                  {!isMobile && <DataTableCell>{item.event}</DataTableCell>}
                  <DataTableCell variant="muted">
                    {new Date(item.issuedAt).toLocaleDateString("pt-BR")}
                  </DataTableCell>
                  <DataTableCell>
                    <StatusPill tone={item.checkinStatus === "Realizado" ? "accent" : "warning"}>
                      {item.checkinStatus}
                    </StatusPill>
                  </DataTableCell>
                </DataTableRow>
              ))
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
