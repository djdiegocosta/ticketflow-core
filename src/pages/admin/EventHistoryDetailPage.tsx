import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  DollarSign,
  Ticket,
  TrendingUp,
  Users,
  Wine,
} from "lucide-react";
import { formatCurrency } from "@/lib/sales-queries";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { StatusPill } from "@/components/admin/DataTable";
import {
  MOCK_EVENT_HISTORY_DETAIL,
  type MockEventHistoryDetail,
} from "@/lib/mocks/historico-eventos.mock";
import { cn } from "@/lib/utils";

const card = "bg-bg-secondary p-5 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)]";

const TABS = [
  "Resumo",
  "Público e Ingressos",
  "Vendas por Lote",
  "Financeiro",
  "Bar",
  "Indicadores",
] as const;
type Tab = (typeof TABS)[number];

function formatPercent(value: number) {
  return `${value.toFixed(0)}%`;
}

/** Deriva os números exibidos a partir do mock — cálculo de apresentação, não regra de negócio real. */
function deriveDisplayNumbers(event: MockEventHistoryDetail) {
  const totalCosts = Object.values(event.finance.costs).reduce((sum, v) => sum + v, 0);
  const totalRevenue = event.finance.ticketsRevenue + event.finance.barRevenue;
  const netResult = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0;
  const barGrossResult = event.bar.totalSales - event.bar.productCost;
  const barCostPercent = event.bar.totalSales > 0 ? (event.bar.productCost / event.bar.totalSales) * 100 : 0;

  const ticketAverage = event.ticketsSold > 0 ? event.finance.ticketsRevenue / event.ticketsSold : 0;
  const revenuePerAttendee = event.attendance > 0 ? totalRevenue / event.attendance : 0;
  const consumptionAverage = event.bar.consumers > 0 ? event.bar.totalSales / event.bar.consumers : 0;
  const presaleShare = event.attendance > 0 ? (event.audience.presale / event.attendance) * 100 : 0;
  const boxOfficeShare = event.attendance > 0 ? (event.audience.boxOffice / event.attendance) * 100 : 0;
  const courtesyShare = event.attendance > 0 ? (event.audience.courtesies / event.attendance) * 100 : 0;

  return {
    totalCosts,
    totalRevenue,
    netResult,
    margin,
    barGrossResult,
    barCostPercent,
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

function AudienceCard({ event, nums }: { event: MockEventHistoryDetail; nums: ReturnType<typeof deriveDisplayNumbers> }) {
  return (
    <div className={card}>
      <SectionTitle icon={Users}>Público</SectionTitle>
      <Row label="Ingressos antecipados" value={String(event.audience.presale)} />
      <Row label="Ingressos bilheteria" value={String(event.audience.boxOffice)} />
      <Row label="Cortesias" value={String(event.audience.courtesies)} />
      <div className="mt-2 border-t border-border-subtle pt-2">
        <Row label="Total de público" value={String(event.attendance)} strong />
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
      </div>
    </div>
  );
}

function BatchesCard({ event }: { event: MockEventHistoryDetail }) {
  const totalPaid = event.batches.reduce((sum, b) => sum + b.quantity, 0);
  return (
    <div className={card}>
      <SectionTitle icon={Ticket}>Vendas de ingressos</SectionTitle>
      <p className="-mt-3 mb-3 text-small text-text-secondary">Por lote</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th className="pb-2 text-small font-medium text-text-secondary">Lote</th>
              <th className="pb-2 text-small font-medium text-text-secondary">Quantidade</th>
              <th className="pb-2 text-small font-medium text-text-secondary">Valor unitário</th>
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
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-border-subtle pt-3">
        <div>
          <p className="text-small text-text-secondary">Total de ingressos pagos</p>
          <p className="text-body font-semibold text-text-primary">{totalPaid}</p>
        </div>
        <div>
          <p className="text-small text-text-secondary">Total de cortesias</p>
          <p className="text-body font-semibold text-text-primary">{event.audience.courtesies}</p>
        </div>
      </div>
    </div>
  );
}

function FinanceCard({ event, nums }: { event: MockEventHistoryDetail; nums: ReturnType<typeof deriveDisplayNumbers> }) {
  const costLabels: Record<keyof MockEventHistoryDetail["finance"]["costs"], string> = {
    attractions: "Atrações",
    venue: "Espaço",
    soundAndLighting: "Som / Iluminação",
    security: "Segurança",
    staff: "Staff",
    marketing: "Marketing",
    structure: "Estrutura",
    barCost: "Custo dos produtos do bar",
    other: "Outros",
  };
  return (
    <div className={card}>
      <SectionTitle icon={DollarSign}>Financeiro</SectionTitle>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-small font-medium text-text-secondary">Receitas</p>
          <Row label="Ingressos" value={formatCurrency(event.finance.ticketsRevenue)} />
          <Row label="Bar" value={formatCurrency(event.finance.barRevenue)} />
          <div className="mt-1 border-t border-border-subtle pt-2">
            <Row label="Receita total" value={formatCurrency(nums.totalRevenue)} strong />
          </div>
        </div>
        <div>
          <p className="mb-1 text-small font-medium text-text-secondary">Custos</p>
          {(Object.keys(costLabels) as Array<keyof typeof costLabels>).map((key) => (
            <Row key={key} label={costLabels[key]} value={formatCurrency(event.finance.costs[key])} />
          ))}
          <div className="mt-1 border-t border-border-subtle pt-2">
            <Row label="Total de custos" value={formatCurrency(nums.totalCosts)} strong />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row">
        <div className={cn("flex-1 p-3.5 rounded-[var(--radius-sm)]", nums.netResult >= 0 ? "bg-accent-muted" : "bg-error-muted")}>
          <p className={cn("text-small", nums.netResult >= 0 ? "text-accent-text" : "text-error-text")}>Resultado líquido</p>
          <p className={cn("text-heading-2", nums.netResult >= 0 ? "text-accent-text" : "text-error-text")}>
            {formatCurrency(nums.netResult)}
          </p>
        </div>
        <div className="flex-1 bg-bg-tertiary p-3.5 rounded-[var(--radius-sm)]">
          <p className="text-small text-text-secondary">Margem</p>
          <p className="text-heading-2 text-text-primary">{formatPercent(nums.margin)}</p>
        </div>
      </div>
    </div>
  );
}

function BarCard({ event, nums }: { event: MockEventHistoryDetail; nums: ReturnType<typeof deriveDisplayNumbers> }) {
  return (
    <div className={card}>
      <SectionTitle icon={Wine}>Bar</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-small text-text-secondary">Venda total</p>
          <p className="text-body font-semibold text-text-primary">{formatCurrency(event.bar.totalSales)}</p>
        </div>
        <div>
          <p className="text-small text-text-secondary">Custo dos produtos</p>
          <p className="text-body font-semibold text-text-primary">{formatCurrency(event.bar.productCost)}</p>
        </div>
        <div>
          <p className="text-small text-text-secondary">Resultado bruto</p>
          <p className="text-body font-semibold text-accent-text">{formatCurrency(nums.barGrossResult)}</p>
        </div>
        <div>
          <p className="text-small text-text-secondary">Público consumidor</p>
          <p className="text-body font-semibold text-text-primary">{event.bar.consumers}</p>
        </div>
        <div>
          <p className="text-small text-text-secondary">Consumo médio por pessoa</p>
          <p className="text-body font-semibold text-text-primary">{formatCurrency(nums.consumptionAverage)}</p>
        </div>
        <div>
          <p className="text-small text-text-secondary">Custo sobre venda</p>
          <p className="text-body font-semibold text-text-primary">{formatPercent(nums.barCostPercent)}</p>
        </div>
      </div>
    </div>
  );
}

function IndicatorsCard({ nums }: { nums: ReturnType<typeof deriveDisplayNumbers> }) {
  const items = [
    { label: "Ticket médio", value: formatCurrency(nums.ticketAverage) },
    { label: "Receita por pessoa", value: formatCurrency(nums.revenuePerAttendee) },
    { label: "Consumo médio", value: formatCurrency(nums.consumptionAverage) },
    { label: "Receita por participante", value: formatCurrency(nums.revenuePerAttendee) },
    { label: "Venda antecipada", value: formatPercent(nums.presaleShare) },
    { label: "Cortesias", value: formatPercent(nums.courtesyShare) },
  ];
  return (
    <div className={card}>
      <SectionTitle icon={BarChart3}>Indicadores</SectionTitle>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-small text-text-secondary">{item.label}</p>
            <p className="text-body font-semibold text-text-primary">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesCard({ event }: { event: MockEventHistoryDetail }) {
  return (
    <div className={card}>
      <SectionTitle icon={ClipboardList}>Observações do produtor</SectionTitle>
      <p className="text-body text-text-secondary">{event.notes}</p>
    </div>
  );
}

export function EventHistoryDetailPage({ id }: { id: string }) {
  const [tab, setTab] = useState<Tab>("Resumo");
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

  return (
    <div className="space-y-5">
      <Link
        to="/admin/ferramentas/historico-eventos"
        className="inline-flex items-center gap-1.5 text-small text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para o histórico
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 shrink-0 bg-cover bg-center rounded-[var(--radius-sm)]"
            style={{ backgroundImage: `url(${event.coverImage})` }}
          />
          <div>
            <h1 className="text-heading-1 text-text-primary">{event.title}</h1>
            <p className="mt-0.5 text-small text-text-secondary">
              {new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}{" "}
              · {event.venue} · {event.city}
            </p>
            <div className="mt-1.5">
              <StatusPill tone="neutral">
                Encerrado em{" "}
                {new Date(event.closedAt + "T12:00:00").toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </StatusPill>
            </div>
          </div>
        </div>

        <MiniMetricGrid className="sm:grid-cols-4 lg:w-auto lg:min-w-[420px]">
          <MiniMetricCard title="Público" value={event.attendance} icon={Users} />
          <MiniMetricCard title="Ingressos" value={event.ticketsSold} icon={Ticket} />
          <MiniMetricCard title="Receita" value={formatCurrency(nums.totalRevenue)} icon={DollarSign} />
          <MiniMetricCard
            title="Resultado"
            value={formatCurrency(nums.netResult)}
            icon={TrendingUp}
            iconColor={nums.netResult >= 0 ? "text-accent-text" : "text-error-text"}
          />
        </MiniMetricGrid>
      </div>

      <div className="flex items-center gap-5 overflow-x-auto border-b border-border-subtle">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 py-2.5 text-body font-medium transition-colors",
              tab === t
                ? "border-accent text-accent-text"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Resumo" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <AudienceCard event={event} nums={nums} />
          <BatchesCard event={event} />
          <BarCard event={event} nums={nums} />
          <div className="lg:col-span-2">
            <FinanceCard event={event} nums={nums} />
          </div>
          <IndicatorsCard nums={nums} />
          <div className="lg:col-span-3">
            <NotesCard event={event} />
          </div>
        </div>
      )}

      {tab === "Público e Ingressos" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AudienceCard event={event} nums={nums} />
          <BatchesCard event={event} />
        </div>
      )}

      {tab === "Vendas por Lote" && <BatchesCard event={event} />}

      {tab === "Financeiro" && <FinanceCard event={event} nums={nums} />}

      {tab === "Bar" && <BarCard event={event} nums={nums} />}

      {tab === "Indicadores" && <IndicatorsCard nums={nums} />}
    </div>
  );
}
