import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  DollarSign,
  ScanBarcode,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
  Wine,
} from "lucide-react";
import { formatCurrency } from "@/lib/sales-queries";
import { DashboardMetricCard } from "@/components/admin/DashboardMetricCard";
import { StatusPill } from "@/components/admin/DataTable";
import { useEventHistoryDetail } from "@/lib/event-history-queries";
import type { EventHistorySnapshot } from "@/lib/event-history-queries";
import { cn } from "@/lib/utils";

const card = "rounded-[var(--radius-md)] bg-bg-secondary p-5 shadow-[var(--shadow-sm)]";

function formatPercent(value: number) {
  return value.toFixed(0) + "%";
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-heading-2 text-text-primary">
      <Icon className="h-4 w-4 text-text-secondary" />
      {children}
    </h3>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-small text-text-secondary">{label}</span>
      <span className={cn("text-body text-text-primary", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

function Tile({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-bg-tertiary p-4">
      <p className="text-small text-text-secondary">{label}</p>
      <p className={cn("mt-1 break-words text-heading-2 leading-tight text-text-primary", valueColor)}>
        {value}
      </p>
    </div>
  );
}

function AudienceSection({ snapshot }: { snapshot: EventHistorySnapshot }) {
  const paidTickets = snapshot.audience.paidTickets;
  const presaleShare = paidTickets > 0 ? (snapshot.audience.presale / paidTickets) * 100 : 0;
  const boxOfficeShare = paidTickets > 0 ? (snapshot.audience.boxOffice / paidTickets) * 100 : 0;

  return (
    <div className={card}>
      <SectionTitle icon={Users}>Público</SectionTitle>
      <Row label="Ingressos antecipados" value={String(snapshot.audience.presale)} />
      <Row label="Ingressos bilheteria" value={String(snapshot.audience.boxOffice)} />
      <Row label="Cortesias presentes" value={String(snapshot.audience.courtesies)} />
      <div className="mt-2 border-t border-border-subtle pt-2">
        <Row
          label="Público presente"
          value={String(snapshot.audience.attendancePresent)}
          strong
        />
      </div>

      <div className="mt-4">
        <div className="flex h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-bg-tertiary">
          <div className="bg-accent" style={{ width: presaleShare + "%" }} />
          <div className="bg-info" style={{ width: boxOfficeShare + "%" }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[var(--radius-full)] bg-accent" />
            {formatPercent(presaleShare)} antecipado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[var(--radius-full)] bg-info" />
            {formatPercent(boxOfficeShare)} bilheteria
          </span>
        </div>
        <p className="mt-2 text-micro text-text-secondary">
          Percentuais calculados somente sobre ingressos pagos.
        </p>
      </div>
    </div>
  );
}

/** Ordena os lotes no padrão: Promocional primeiro, depois 1º, 2º, 3º... */
function batchRank(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("promo")) return 0;
  const numMatch = n.match(/\d+/);
  if (numMatch) return parseInt(numMatch[0], 10);
  const ordinalWords = [
    "primeiro",
    "segundo",
    "terceiro",
    "quarto",
    "quinto",
    "sexto",
    "sétimo",
    "oitavo",
    "nono",
    "décimo",
  ];
  const idx = ordinalWords.findIndex((w) => n.includes(w));
  if (idx >= 0) return idx + 1;
  return 999;
}

function TicketSalesSection({ snapshot }: { snapshot: EventHistorySnapshot }) {
  const orderedBatches = [...snapshot.batches].sort((a, b) => batchRank(a.name) - batchRank(b.name));
  const batchesTotal = snapshot.batches.reduce((sum, batch) => sum + batch.quantity, 0);

  return (
    <div className={card}>
      <SectionTitle icon={Ticket}>Vendas de ingressos</SectionTitle>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th className="pb-2 text-small font-medium text-text-secondary">Lote</th>
              <th className="pb-2 text-small font-medium text-text-secondary">Qtd.</th>
              <th className="pb-2 text-small font-medium text-text-secondary">Valor</th>
              <th className="pb-2 text-right text-small font-medium text-text-secondary">Receita</th>
            </tr>
          </thead>
          <tbody>
            {orderedBatches.map((batch) => (
              <tr key={batch.id} className="border-b border-border-subtle last:border-0">
                <td className="py-2 text-body text-text-primary">{batch.name}</td>
                <td className="py-2 text-body text-text-secondary">{batch.quantity}</td>
                <td className="py-2 text-body text-text-secondary">
                  {formatCurrency(batch.unitValue)}
                </td>
                <td className="py-2 text-right text-body font-semibold text-text-primary">
                  {formatCurrency(batch.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-bg-tertiary p-4">
          <div className="flex items-center gap-3">
            <Ticket className="h-4 w-4 shrink-0 text-text-secondary" />
            <p className="text-body font-medium text-text-primary">TicketFlow</p>
          </div>
          <p className="text-body font-semibold text-text-primary">{batchesTotal} ingressos</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-bg-tertiary p-4">
          <div className="flex items-center gap-3">
            <ScanBarcode className="h-4 w-4 shrink-0 text-text-secondary" />
            <p className="text-body font-medium text-text-primary">Bilheteria</p>
          </div>
          <p className="text-body font-semibold text-text-primary">
            {snapshot.boxOfficeSale.quantity} ingressos
          </p>
        </div>
      </div>
    </div>
  );
}

function BarSection({ snapshot }: { snapshot: EventHistorySnapshot }) {
  return (
    <div className={card}>
      <SectionTitle icon={Wine}>Bar</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Venda total" value={formatCurrency(snapshot.bar.totalSales)} />
        <Tile label="Custo dos produtos" value={formatCurrency(snapshot.bar.productCost)} />
        <Tile
          label="Resultado bruto"
          value={formatCurrency(snapshot.bar.grossResult)}
          valueColor="text-accent-text"
        />
        <Tile label="Custo sobre venda" value={formatPercent(snapshot.bar.costPercent)} />
        <Tile label="Público presente" value={String(snapshot.audience.attendancePresent)} />
        <Tile
          label="Consumo médio"
          value={
            snapshot.audience.attendancePresent > 0
              ? formatCurrency(snapshot.bar.totalSales / snapshot.audience.attendancePresent)
              : formatCurrency(0)
          }
        />
      </div>
      <p className="mt-3 text-micro text-text-secondary">
        Venda e custo do bar foram informados manualmente no encerramento.
      </p>
    </div>
  );
}

function FinanceSection({ snapshot }: { snapshot: EventHistorySnapshot }) {
  const positive = snapshot.finance.netResult >= 0;

  return (
    <div className={card}>
      <SectionTitle icon={DollarSign}>Financeiro</SectionTitle>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-small font-medium text-text-secondary">Receitas</p>
          <Row label="Receita de ingressos" value={formatCurrency(snapshot.finance.ticketsRevenue)} />
          <Row label="Receita do bar" value={formatCurrency(snapshot.finance.barRevenue)} />
          <div className="mt-1 border-t border-border-subtle pt-2">
            <Row label="Receita total" value={formatCurrency(snapshot.finance.totalRevenue)} strong />
          </div>
        </div>

        <div>
          <p className="mb-1 text-small font-medium text-text-secondary">Custos</p>
          <Row label="Custo do evento" value={formatCurrency(snapshot.finance.eventCost)} />
          <Row label="Custo do bar" value={formatCurrency(snapshot.finance.barCost)} />
          <div className="mt-1 border-t border-border-subtle pt-2">
            <Row label="Custos totais" value={formatCurrency(snapshot.finance.totalCosts)} strong />
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 rounded-[var(--radius-md)] p-4",
          positive ? "bg-accent-muted" : "bg-error-muted",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className={cn(
                "text-small font-medium",
                positive ? "text-accent-text" : "text-error-text",
              )}
            >
              Resultado líquido
            </p>
            <p
              className={cn(
                "break-words text-heading-1 font-semibold leading-tight",
                positive ? "text-accent-text" : "text-error-text",
              )}
            >
              {formatCurrency(snapshot.finance.netResult)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-small text-text-secondary">Margem</p>
            <p
              className={cn(
                "text-heading-2",
                positive ? "text-accent-text" : "text-error-text",
              )}
            >
              {snapshot.finance.margin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndicatorsSection({ snapshot }: { snapshot: EventHistorySnapshot }) {
  const paidTickets = snapshot.audience.paidTickets;
  const ticketAverage =
    paidTickets > 0 ? snapshot.finance.ticketsRevenue / paidTickets : 0;
  const revenuePerPerson =
    snapshot.audience.attendancePresent > 0
      ? snapshot.finance.totalRevenue / snapshot.audience.attendancePresent
      : 0;
  const consumptionAverage =
    snapshot.audience.attendancePresent > 0
      ? snapshot.finance.barRevenue / snapshot.audience.attendancePresent
      : 0;
  const presaleShare =
    paidTickets > 0 ? (snapshot.audience.presale / paidTickets) * 100 : 0;
  const courtesyShare =
    snapshot.audience.attendancePresent > 0
      ? (snapshot.audience.courtesies / snapshot.audience.attendancePresent) * 100
      : 0;

  return (
    <div className={card}>
      <SectionTitle icon={BarChart3}>Indicadores</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Ticket médio" value={formatCurrency(ticketAverage)} />
        <Tile label="Receita por pessoa" value={formatCurrency(revenuePerPerson)} />
        <Tile label="Consumo médio" value={formatCurrency(consumptionAverage)} />
        <Tile label="Venda antecipada" value={formatPercent(presaleShare)} />
        <Tile label="Cortesias" value={formatPercent(courtesyShare)} />
        <Tile label="Custo do bar" value={formatPercent(snapshot.bar.costPercent)} />
      </div>
    </div>
  );
}

function NotesSection({ snapshot }: { snapshot: EventHistorySnapshot }) {
  return (
    <div className={card}>
      <SectionTitle icon={ClipboardList}>Observações do produtor</SectionTitle>
      <p className="text-body text-text-secondary">
        {snapshot.notes || "Nenhuma observação registrada."}
      </p>
    </div>
  );
}

export function EventHistoryDetailPage({ id }: { id: string }) {
  const { data: snapshot, isLoading, error } = useEventHistoryDetail(id);

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-md)] bg-bg-secondary p-10 text-center text-small text-text-secondary">
        Carregando evento...
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className={card}>
        <p className="text-body text-text-secondary">
          Não foi possível localizar este encerramento no histórico.
        </p>
        <Link
          to="/admin/ferramentas/historico-eventos"
          className="mt-3 inline-flex text-body text-accent-text hover:underline"
        >
          Voltar para o histórico
        </Link>
      </div>
    );
  }

  const positive = snapshot.finance.netResult >= 0;

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/admin/ferramentas/historico-eventos"
          className="inline-flex items-center gap-1.5 text-small text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o histórico
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-heading-1 text-text-primary">{snapshot.event.title}</h1>
          <StatusPill tone="neutral">
            Encerrado em{" "}
            {new Date(snapshot.closedAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </StatusPill>
        </div>

        <p className="mt-0.5 text-small text-text-secondary">
          {new Date(snapshot.event.date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}{" "}
          · {snapshot.event.venue}
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="Público"
          value={snapshot.audience.attendancePresent}
          icon={Users}
          iconColor="text-icon-brand"
          secondary="presentes no evento"
        />
        <DashboardMetricCard
          title="Ingressos"
          value={snapshot.audience.paidTickets}
          icon={Ticket}
          iconColor="text-icon-brand"
          secondary="pagos (antecipado + bilheteria)"
        />
        <DashboardMetricCard
          title="Receita"
          value={formatCurrency(snapshot.finance.totalRevenue)}
          icon={DollarSign}
          iconColor="text-icon-brand"
          secondary="ingressos + bar"
        />
        <DashboardMetricCard
          title="Resultado"
          value={formatCurrency(snapshot.finance.netResult)}
          icon={positive ? TrendingUp : TrendingDown}
          iconColor={positive ? "text-accent-text" : "text-error-text"}
          valueColor={positive ? "text-accent-text" : "text-error-text"}
          size="default"
          secondary="após custos"
        />
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AudienceSection snapshot={snapshot} />
          <TicketSalesSection snapshot={snapshot} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BarSection snapshot={snapshot} />
          <IndicatorsSection snapshot={snapshot} />
        </div>

        <FinanceSection snapshot={snapshot} />
        <NotesSection snapshot={snapshot} />
      </div>
    </div>
  );
}
