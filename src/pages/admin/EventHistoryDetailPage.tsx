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
import {
  MOCK_EVENT_HISTORY_DETAIL,
  type MockEventHistoryDetail,
} from "@/lib/mocks/historico-eventos.mock";
import { cn } from "@/lib/utils";

const card = "bg-bg-secondary p-5 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)]";

function formatPercent(value: number) {
  return `${value.toFixed(0)}%`;
}

/** Deriva os números exibidos a partir do mock — cálculo de apresentação, não regra de negócio real. */
function deriveDisplayNumbers(event: MockEventHistoryDetail) {
  const totalRevenue = event.finance.ticketsRevenue + event.finance.barRevenue;
  const totalCosts = event.finance.eventCost + event.finance.barCost;
  const netResult = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0;

  const barGrossResult = event.bar.totalSales - event.bar.productCost;
  const barCostPercent = event.bar.totalSales > 0 ? (event.bar.productCost / event.bar.totalSales) * 100 : 0;

  // Ingressos pagos = antecipados + bilheteria. Cortesias não entram nesse total.
  const paidTickets = event.audience.presale + event.audience.boxOffice;
  const ticketAverage = paidTickets > 0 ? event.finance.ticketsRevenue / paidTickets : 0;
  const revenuePerAttendee = event.attendancePresent > 0 ? totalRevenue / event.attendancePresent : 0;
  const consumptionAverage = event.attendancePresent > 0 ? event.bar.totalSales / event.attendancePresent : 0;
  const presaleShare = paidTickets > 0 ? (event.audience.presale / paidTickets) * 100 : 0;
  const boxOfficeShare = paidTickets > 0 ? (event.audience.boxOffice / paidTickets) * 100 : 0;
  // Mock: assume todas as cortesias emitidas compareceram (cortesias presentes ÷ público presente).
  const courtesyShare = event.attendancePresent > 0 ? (event.audience.courtesies / event.attendancePresent) * 100 : 0;

  return {
    totalRevenue,
    totalCosts,
    netResult,
    margin,
    barGrossResult,
    barCostPercent,
    paidTickets,
    ticketAverage,
    revenuePerAttendee,
    consumptionAverage,
    presaleShare,
    boxOfficeShare,
    courtesyShare,
  };
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-heading-2 text-text-primary">
      <Icon className="h-4 w-4 text-text-secondary" />
      {children}
    </h3>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-small text-text-secondary">{label}</span>
      <span className={cn("text-body text-text-primary", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

/** Card compacto reutilizado nas seções Bar e Indicadores — 2 por linha. */
function Tile({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-bg-tertiary p-4">
      <p className="text-small text-text-secondary">{label}</p>
      <p className={cn("mt-1 break-words text-heading-2 leading-tight text-text-primary", valueColor)}>{value}</p>
    </div>
  );
}

function AudienceSection({ event, nums }: { event: MockEventHistoryDetail; nums: ReturnType<typeof deriveDisplayNumbers> }) {
  return (
    <div className={card}>
      <SectionTitle icon={Users}>Público</SectionTitle>
      <Row label="Ingressos antecipados" value={String(event.audience.presale)} />
      <Row label="Ingressos bilheteria" value={String(event.audience.boxOffice)} />
      <Row label="Cortesias" value={String(event.audience.courtesies)} />
      <div className="mt-2 border-t border-border-subtle pt-2">
        <Row label="Público presente" value={String(event.attendancePresent)} strong />
      </div>
      <div className="mt-4">
        <div className="flex h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-bg-tertiary">
          <div className="bg-accent" style={{ width: `${nums.presaleShare}%` }} />
          <div className="bg-info" style={{ width: `${nums.boxOfficeShare}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[var(--radius-full)] bg-accent" />
            {formatPercent(nums.presaleShare)} antecipado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[var(--radius-full)] bg-info" />
            {formatPercent(nums.boxOfficeShare)} bilheteria
          </span>
        </div>
        <p className="mt-2 text-micro text-text-secondary">Considera apenas ingressos pagos (antecipados + bilheteria).</p>
      </div>
    </div>
  );
}

function TicketSalesSection({ event }: { event: MockEventHistoryDetail }) {
  const batchesTotal = event.batches.reduce((sum, b) => sum + b.quantity, 0);
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
            {event.batches.map((batch) => (
              <tr key={batch.name} className="border-b border-border-subtle last:border-0">
                <td className="py-2 text-body text-text-primary">{batch.name}</td>
                <td className="py-2 text-body text-text-secondary">{batch.quantity}</td>
                <td className="py-2 text-body text-text-secondary">{formatCurrency(batch.unitValue)}</td>
                <td className="py-2 text-right text-body font-semibold text-text-primary">
                  {formatCurrency(batch.quantity * batch.unitValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-small text-text-secondary">
        <span>
          Total de ingressos pelo TicketFlow: <span className="font-semibold text-text-primary">{batchesTotal}</span>
        </span>
        <span>
          Cortesias: <span className="font-semibold text-text-primary">{event.audience.courtesies}</span>
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-bg-tertiary p-4">
        <div className="flex items-center gap-3">
          <ScanBarcode className="h-4 w-4 shrink-0 text-text-secondary" />
          <div>
            <p className="text-body font-medium text-text-primary">Bilheteria</p>
            <p className="text-micro text-text-secondary">Dado informado manualmente no encerramento</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-body font-semibold text-text-primary">{event.boxOfficeSale.quantity} ingressos</p>
          <p className="text-small text-text-secondary">{formatCurrency(event.boxOfficeSale.revenue)}</p>
        </div>
      </div>
    </div>
  );
}

function BarSection({ event, nums }: { event: MockEventHistoryDetail; nums: ReturnType<typeof deriveDisplayNumbers> }) {
  return (
    <div className={card}>
      <SectionTitle icon={Wine}>Bar</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Venda total" value={formatCurrency(event.bar.totalSales)} />
        <Tile label="Custo dos produtos" value={formatCurrency(event.bar.productCost)} />
        <Tile label="Resultado bruto" value={formatCurrency(nums.barGrossResult)} valueColor="text-accent-text" />
        <Tile label="Custo sobre venda" value={formatPercent(nums.barCostPercent)} />
        <Tile label="Público presente" value={String(event.attendancePresent)} />
        <Tile label="Consumo médio" value={formatCurrency(nums.consumptionAverage)} />
      </div>
      <p className="mt-3 text-micro text-text-secondary">
        Venda e custo do bar são informados manualmente no encerramento — o custo não é um percentual fixo.
      </p>
    </div>
  );
}

function FinanceSection({ event, nums }: { event: MockEventHistoryDetail; nums: ReturnType<typeof deriveDisplayNumbers> }) {
  return (
    <div className={card}>
      <SectionTitle icon={DollarSign}>Financeiro</SectionTitle>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-small font-medium text-text-secondary">Receitas</p>
          <Row label="Receita de ingressos" value={formatCurrency(event.finance.ticketsRevenue)} />
          <Row label="Receita do bar" value={formatCurrency(event.finance.barRevenue)} />
          <div className="mt-1 border-t border-border-subtle pt-2">
            <Row label="Receita total" value={formatCurrency(nums.totalRevenue)} strong />
          </div>
        </div>
        <div>
          <p className="mb-1 text-small font-medium text-text-secondary">Custos</p>
          <Row label="Custo do evento" value={formatCurrency(event.finance.eventCost)} />
          <Row label="Custo do bar" value={formatCurrency(event.finance.barCost)} />
          <div className="mt-1 border-t border-border-subtle pt-2">
            <Row label="Custos totais" value={formatCurrency(nums.totalCosts)} strong />
          </div>
        </div>
      </div>

      <div className={cn("mt-4 p-4 rounded-[var(--radius-md)]", nums.netResult >= 0 ? "bg-accent-muted" : "bg-error-muted")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={cn("text-small font-medium", nums.netResult >= 0 ? "text-accent-text" : "text-error-text")}>
              Resultado líquido
            </p>
            <p className={cn("break-words text-heading-1 leading-tight", nums.netResult >= 0 ? "text-accent-text" : "text-error-text")}>
              {formatCurrency(nums.netResult)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-small text-text-secondary">Margem</p>
            <p className={cn("text-heading-2", nums.netResult >= 0 ? "text-accent-text" : "text-error-text")}>
              {formatPercent(nums.margin)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndicatorsSection({ nums }: { nums: ReturnType<typeof deriveDisplayNumbers> }) {
  return (
    <div className={card}>
      <SectionTitle icon={BarChart3}>Indicadores</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Ticket médio" value={formatCurrency(nums.ticketAverage)} />
        <Tile label="Receita por pessoa" value={formatCurrency(nums.revenuePerAttendee)} />
        <Tile label="Consumo médio" value={formatCurrency(nums.consumptionAverage)} />
        <Tile label="Venda antecipada" value={formatPercent(nums.presaleShare)} />
        <Tile label="Cortesias" value={formatPercent(nums.courtesyShare)} />
        <Tile label="Custo do bar" value={formatPercent(nums.barCostPercent)} />
      </div>
    </div>
  );
}

function NotesSection({ event }: { event: MockEventHistoryDetail }) {
  return (
    <div className={card}>
      <SectionTitle icon={ClipboardList}>Observações do produtor</SectionTitle>
      <p className="text-body text-text-secondary">{event.notes}</p>
    </div>
  );
}

export function EventHistoryDetailPage({ id }: { id: string }) {
  const event = MOCK_EVENT_HISTORY_DETAIL[id];

  if (!event) {
    return (
      <div className={card}>
        <p className="text-body text-text-secondary">Evento não encontrado nos dados de exemplo.</p>
        <Link to="/admin/ferramentas/historico-eventos" className="mt-3 inline-block text-body text-accent-text hover:underline">
          Voltar para o histórico
        </Link>
      </div>
    );
  }

  const nums = deriveDisplayNumbers(event);
  const resultPositive = nums.netResult >= 0;

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
          <h1 className="text-heading-1 text-text-primary">{event.title}</h1>
          <StatusPill tone="neutral">
            Encerrado em{" "}
            {new Date(event.closedAt + "T12:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </StatusPill>
        </div>
        <p className="mt-0.5 text-small text-text-secondary">
          {new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}{" "}
          · {event.venue} · {event.city}
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard title="Público" value={event.attendancePresent} icon={Users} iconColor="text-icon-brand" secondary="presentes no evento" />
        <DashboardMetricCard title="Ingressos" value={event.ticketsSold} icon={Ticket} iconColor="text-icon-brand" secondary="pagos (antecipado + bilheteria)" />
        <DashboardMetricCard title="Receita" value={formatCurrency(nums.totalRevenue)} icon={DollarSign} iconColor="text-icon-brand" secondary="ingressos + bar" />
        <DashboardMetricCard
          title="Resultado"
          value={formatCurrency(nums.netResult)}
          icon={resultPositive ? TrendingUp : TrendingDown}
          iconColor={resultPositive ? "text-accent-text" : "text-error-text"}
          valueColor={resultPositive ? "text-accent-text" : "text-error-text"}
          secondary="após custos"
        />
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AudienceSection event={event} nums={nums} />
          <TicketSalesSection event={event} />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BarSection event={event} nums={nums} />
          <IndicatorsSection nums={nums} />
        </div>
        <FinanceSection event={event} nums={nums} />
        <NotesSection event={event} />
      </div>
    </div>
  );
}
