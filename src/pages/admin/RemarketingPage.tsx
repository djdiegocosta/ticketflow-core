import * as React from "react";
import {
  AlertTriangle,
  ChevronDown,
  DollarSign,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DataTable,
  DataTableCell,
  DataTablePagination,
  DataTableShell,
  DataTableHeadRow,
  DataTableRow,
  StatusPill,
  type PillTone,
} from "@/components/admin/DataTable";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { ListPageHeader } from "@/components/admin/PrimaryActionButton";
import { FilterBar, filterFieldClass } from "@/components/admin/FilterBar";
import {
  Abandon,
  AbandonStatus,
  AbandonType,
  DEFAULT_TEMPLATES,
  MOCK_ABANDONS,
  PERIOD_LABELS,
  PERIOD_METRICS,
  REMARKETING_EVENTS,
  RemarketingPeriod,
  buildMessage,
} from "@/lib/remarketing-data";
import { formatCurrency, MOCK_SALES } from "@/lib/sales-data";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusTone: Record<AbandonStatus, PillTone> = {
  "Não contactado": "neutral",
  Contactado: "info",
  Convertido: "success",
};

const typeTone: Record<AbandonType, PillTone> = {
  "Não gerou Pix": "warning",
  "Pix não pago": "accent",
};



function TemplateEditor({
  title,
  value,
  onChange,
  onReset,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-body font-semibold text-[var(--text-primary)]">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Restaurar padrão
        </Button>
      </div>
      <Textarea
        className="mt-3 min-h-[110px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="mt-2 text-micro text-[var(--text-disabled)]">
        Variáveis disponíveis: {"{nome}"}, {"{evento}"}, {"{lote}"}
      </p>
    </div>
  );
}

export function RemarketingPage() {
  const [period, setPeriod] = React.useState<RemarketingPeriod>("24h");
  const [eventFilter, setEventFilter] = React.useState("todos");
  const [pageSize, setPageSize] = React.useState("25");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [templatesOpen, setTemplatesOpen] = React.useState(true);
  const [templates, setTemplates] = React.useState<Record<AbandonType, string>>({
    ...DEFAULT_TEMPLATES,
  });
  const [rows, setRows] = React.useState<Abandon[]>([]);
  const [preview, setPreview] = React.useState<Abandon | null>(null);

  React.useEffect(() => {
    // Normalização básica de WhatsApp para comparação
    const normalize = (val?: string) => val?.replace(/\D/g, "") || "";

    const enrichedRows = MOCK_ABANDONS.map((abandon) => {
      if (abandon.status === "Convertido") return abandon;

      const abandonWa = normalize(abandon.whatsapp);
      if (!abandonWa) return abandon;

      // Verifica se existe uma venda paga para este WhatsApp + Evento
      const hasPaidSale = MOCK_SALES.some((sale) => {
        const saleWa = normalize(sale.buyerWhatsapp);
        const matchesWa = saleWa === abandonWa;
        const matchesEvent = sale.eventName === abandon.event;
        const matchesStatus = sale.status === "Pago";

        // Também verificar participantes, pois "Comprador != Participante"
        const matchesParticipant = sale.tickets.some(
          (t) => normalize(t.participantName) === abandonWa || t.participantName === abandon.name
        );

        return (matchesWa || matchesParticipant) && matchesEvent && matchesStatus;
      });

      if (hasPaidSale) {
        return { ...abandon, status: "Convertido" as const };
      }

      return abandon;
    });

    setRows(enrichedRows);
  }, []);

  const metrics = PERIOD_METRICS[period];

  const filtered = React.useMemo(
    () => rows.filter((r) => eventFilter === "todos" || r.event === eventFilter),
    [rows, eventFilter],
  );

  const size = parseInt(pageSize, 10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const paginated = React.useMemo(
    () => filtered.slice((currentPage - 1) * size, currentPage * size),
    [filtered, currentPage, size],
  );

  const updateStatus = (id: string, status: AbandonStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Status atualizado para "${status}".`);
  };

  const openWhatsApp = (row: Abandon) => {
    setPreview(row);
    if (row.status === "Não contactado") {
      updateStatus(row.id, "Contactado");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <ListPageHeader title="Remarketing" />

      {/* Mini dashboard */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-small text-[var(--text-secondary)]">Período das métricas</span>
          <div className="flex border border-[var(--border-subtle)]">
            {(Object.keys(PERIOD_LABELS) as RemarketingPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={[
                  "px-4 py-2 text-small transition-colors",
                  period === p
                    ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                ].join(" ")}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <MiniMetricGrid>
          <MiniMetricCard
            icon={DollarSign}
            iconColor="text-accent-text"
            title="Vendas recuperadas"
            value={formatCurrency(metrics.recoveredRevenue)}
            subtext="no período selecionado"
          />
          <MiniMetricCard
            icon={Ticket}
            iconColor="text-info"
            title="Ingressos recuperados"
            value={String(metrics.recoveredTickets)}
            subtext="ingressos confirmados"
          />
          <MiniMetricCard
            icon={AlertTriangle}
            iconColor="text-warning"
            title="Total de abandonos"
            value={String(metrics.abandons)}
            subtext="checkouts não concluídos"
          />
          <MiniMetricCard
            icon={TrendingUp}
            iconColor="text-success"
            title="Taxa de recuperação"
            value={`${metrics.recoveryRate}%`}
            subtext="abandonos convertidos"
          />
        </MiniMetricGrid>
      </div>

      {/* Templates */}
      <Collapsible
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        className="border border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between p-6 text-left">
          <span className="text-heading-2 text-[var(--text-primary)]">
            Modelos de mensagem para WhatsApp
          </span>
          <ChevronDown
            className={[
              "h-4 w-4 text-[var(--text-secondary)] transition-transform",
              templatesOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 gap-6 px-6 pb-6 lg:grid-cols-2">
            <TemplateEditor
              title='Modelo 1 — "Não gerou Pix"'
              value={templates["Não gerou Pix"]}
              onChange={(v) => setTemplates((t) => ({ ...t, "Não gerou Pix": v }))}
              onReset={() =>
                setTemplates((t) => ({
                  ...t,
                  "Não gerou Pix": DEFAULT_TEMPLATES["Não gerou Pix"],
                }))
              }
            />
            <TemplateEditor
              title='Modelo 2 — "Pix gerado, não pago"'
              value={templates["Pix não pago"]}
              onChange={(v) => setTemplates((t) => ({ ...t, "Pix não pago": v }))}
              onReset={() =>
                setTemplates((t) => ({
                  ...t,
                  "Pix não pago": DEFAULT_TEMPLATES["Pix não pago"],
                }))
              }
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Table Section */}
      <div className="space-y-4">
        <FilterBar>
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
            {REMARKETING_EVENTS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <div className="hidden lg:block" />
        </FilterBar>

        <div className="flex items-center justify-end px-1">
          <div className="flex items-center gap-3 text-micro font-normal text-[var(--text-secondary)]">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-[var(--text-disabled)]" />
              <span>Não contactado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-[var(--warning)]" />
              <span>Contactado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              <span>Convertido</span>
            </div>
          </div>
        </div>

        <DataTableShell>
            <TooltipProvider>
              <DataTable className="min-w-[980px]">
                <DataTableHeadRow
                  columns={[
                    "Nome",
                    "WhatsApp",
                    "Evento",
                    "Tipo de abandono",
                    "Data/hora",
                    "Status",
                    "Ações",
                  ]}
                />
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <DataTableCell colSpan={7} className="py-10 text-center text-body">
                      Nenhum abandono encontrado.
                    </DataTableCell>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <DataTableRow key={row.id}>
                      <DataTableCell variant="primary" className="max-w-[200px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate cursor-default">
                              {row.name ?? "—"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{row.name ?? "—"}</TooltipContent>
                        </Tooltip>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        {row.whatsapp ?? "—"}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        {row.event}
                      </DataTableCell>
                      <DataTableCell>
                        <StatusPill
                          tone={typeTone[row.type]}
                          className="whitespace-nowrap text-[10px]"
                        >
                          {row.type}
                        </StatusPill>
                      </DataTableCell>
                      <DataTableCell variant="muted" className="whitespace-nowrap">
                        {row.createdAt}
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex items-center justify-center whitespace-nowrap">
                          <div
                            className={[
                              "h-2 w-2 rounded-full shrink-0",
                              row.status === "Não contactado" && "bg-[var(--text-disabled)]",
                              row.status === "Contactado" && "bg-[var(--warning)]",
                              row.status === "Convertido" && "bg-[var(--accent)]",
                            ].join(" ")}
                          />
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!row.whatsapp}
                                onClick={() => openWhatsApp(row)}
                                className="h-8 w-8 p-0"
                              >
                                <MessageCircle className="h-4 w-4" />
                                <span className="sr-only">Abrir WhatsApp</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir WhatsApp</TooltipContent>
                          </Tooltip>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </tbody>
            </DataTable>
          </TooltipProvider>
        </DataTableShell>

        <DataTablePagination
          pageSize={size}
          onPageSizeChange={(n) => {
            setPageSize(String(n));
            setCurrentPage(1);
          }}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          startIndex={(currentPage - 1) * size}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Preview modal */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prévia da mensagem</DialogTitle>
            <DialogDescription>
              {preview
                ? `Para ${preview.name ?? "visitante"} — ${preview.whatsapp ?? "sem WhatsApp"}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <StatusPill tone={typeTone[preview.type]}>{preview.type}</StatusPill>
              <p className="whitespace-pre-wrap border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4 text-body text-[var(--text-primary)]">
                {buildMessage(templates[preview.type], {
                  name: preview.name,
                  event: preview.event,
                  lot: preview.lot,
                })}
              </p>
              <p className="text-micro text-[var(--text-disabled)]">
                Envio real será habilitado em uma etapa futura.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
