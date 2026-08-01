import * as React from "react";
import { Plus, Download, Gift, CheckCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { MOCK_COURTESIES, Courtesy } from "@/lib/courtesies-data";
import { generateCheckinListPdf } from "@/lib/checkin-pdf";
import { CreateCourtesyPanel } from "@/components/admin/cortesias/CreateCourtesyPanel";
import { toast } from "sonner";

export function CourtesiesListPage() {
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [eventFilter, setEventFilter] = React.useState("todos");
  const [pageSize, setPageSize] = React.useState("25");
  const [currentPage, setCurrentPage] = React.useState(1);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-heading-1">Cortesias</h1>
        <Button onClick={() => setIsPanelOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          + Nova Cortesia
        </Button>
      </div>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex h-[142px] flex-col justify-center border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6">
          <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
            <Gift className="h-4 w-4" />
            <span>Total de cortesias</span>
          </div>
          <div className="mt-2 text-heading-1 font-semibold">{totalCortesias}</div>
        </div>
        <div className="flex h-[142px] flex-col justify-center border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6">
          <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Check-ins de cortesias</span>
          </div>
          <div className="mt-2 text-heading-1 font-semibold">{totalCheckins}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Buscar convidado..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os eventos</SelectItem>
              <SelectItem value="Show de Rock 2024">Show de Rock 2024</SelectItem>
              <SelectItem value="Festival de Jazz">Festival de Jazz</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleExportPdf} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Gerar lista PDF
        </Button>
      </div>

      {/* Table */}
      <div className="border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <DataTable className="min-w-[720px]">
          <DataTableHeadRow columns={["Convidado", "Evento", "Data de emissão", "Status"]} />
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <DataTableCell
                  colSpan={4}
                  variant="secondary"
                  className="py-10 text-center text-body"
                >
                  Nenhuma cortesia encontrada.
                </DataTableCell>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <DataTableRow key={item.id}>
                  <DataTableCell variant="primary">{item.name}</DataTableCell>
                  <DataTableCell>{item.event}</DataTableCell>
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


        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-4">
          <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
            <span>Exibir</span>
            <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>por página</span>
          </div>

          <Pagination className="w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className="cursor-pointer"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    className="cursor-pointer"
                    isActive={currentPage === page}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  className="cursor-pointer"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      <CreateCourtesyPanel
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
