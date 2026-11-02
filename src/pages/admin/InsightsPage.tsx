import { useMemo, useState } from "react";
import { CalendarDays, Lock, Receipt, Ticket, TrendingUp, Wallet } from "lucide-react";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { BreakdownBarChart, CrossHeatmap, DailyChart, InsightsCard } from "@/components/admin/insights/InsightsCharts";
import { InsightsFilters, type InsightsFilterState } from "@/components/admin/insights/InsightsFilters";
import { useAuth } from "@/lib/auth-context";
import { useEvents } from "@/lib/events-queries";
import {
  useInsightsBreakdown,
  useInsightsCross,
  useInsightsDaily,
  useInsightsSummary,
  type BreakdownDimension,
  type BreakdownRow,
  type InsightsFilters as QueryFilters,
} from "@/lib/insights-queries";
import { formatMeasure, periodRange, sharePercent, type Measure } from "@/lib/insights-format";

function brDate(iso: string | null): string {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—";
}

function BreakdownSection({
  dimension,
  title,
  hint,
  filters,
  measure,
  extra,
  className,
}: {
  dimension: BreakdownDimension;
  title: string;
  hint?: string;
  filters: QueryFilters;
  measure: Measure;
  extra?: (rows: ReadonlyArray<BreakdownRow>) => string | null;
  className?: string;
}) {
  const q = useInsightsBreakdown(dimension, filters);
  const rows = q.data ?? [];
  const total = rows.reduce((s, r) => s + r.orders, 0);
  const note = extra ? extra(rows) : null;
  return (
    <InsightsCard
      title={title}
      {...(hint ? { hint } : {})}
      sampleN={total}
      loading={q.isLoading}
      error={q.isError}
      empty={!q.isLoading && !q.isError && total === 0}
      {...(className ? { className } : {})}
    >
      <BreakdownBarChart rows={rows} measure={measure} />
      {note && <p className="pt-2 text-small font-medium text-text-primary">{note}</p>}
    </InsightsCard>
  );
}

export default function InsightsPage() {
  const { userRole, loading: authLoading } = useAuth();
  const { data: events } = useEvents();
  const [state, setState] = useState<InsightsFilterState>({
    eventSel: "all",
    preset: "all",
    customFrom: "",
    customTo: "",
    origin: "online",
    countSaturday: true,
    leadMax: 20,
    measure: "orders",
  });

  const filters: QueryFilters = useMemo(() => {
    const range =
      state.preset === "custom"
        ? { from: state.customFrom || null, to: state.customTo || null }
        : periodRange(state.preset);
    return {
      eventIds: state.eventSel === "all" ? null : [state.eventSel],
      from: range.from,
      to: range.to,
      origin: state.origin,
      countSaturday: state.countSaturday,
      leadMax: state.leadMax,
    };
  }, [state]);

  const summary = useInsightsSummary(filters);
  const daily = useInsightsDaily(filters);
  const cross = useInsightsCross(filters);

  if (!authLoading && userRole !== "admin") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
        <Lock className="h-8 w-8 text-text-secondary" />
        <p className="text-body text-text-primary">O Insights é exclusivo para administradores.</p>
      </div>
    );
  }

  const s = summary.data;
  const eventList = (events ?? []).map((e) => ({ id: e.id, title: e.title }));
  const ticketAvg = s && s.orders > 0 ? s.revenue / s.orders : 0;
  const m = state.measure;

  const bd5Extra = (rows: ReadonlyArray<BreakdownRow>) => {
    const total = rows.reduce((a, r) => a + r.orders, 0);
    const before = rows.find((r) => r.bucket.startsWith("Até"))?.orders ?? 0;
    return total > 0 ? `${sharePercent(before, total)} das vendas acontecem até o 5º dia útil e ${sharePercent(total - before, total)} depois.` : null;
  };
  const turnExtra = (rows: ReadonlyArray<BreakdownRow>) => {
    const total = rows.reduce((a, r) => a + r.orders, 0);
    const turn = rows.filter((r) => !r.bucket.startsWith("Meio")).reduce((a, r) => a + r.orders, 0);
    return total > 0 ? `${sharePercent(turn, total)} das vendas acontecem na virada do mês (últimos 3 e primeiros 3 dias).` : null;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-heading-1 font-bold text-text-primary">TicketFlow Insights</h1>
        <p className="text-small text-text-secondary">
          Quando e como o público compra. Só vendas pagas, sem cortesias e sem testes, no horário de Brasília.
        </p>
      </header>

      <InsightsFilters state={state} onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))} events={eventList} />

      {s && (
        <p className="rounded-[var(--radius-md)] bg-bg-secondary px-4 py-3 text-small text-text-secondary">
          {s.orders > 0 ? (
            <>
              <span className="font-semibold text-text-primary">{s.orders} vendas analisadas</span>, de {brDate(s.first_date)} a {brDate(s.last_date)}.
            </>
          ) : (
            "Nenhuma venda neste filtro."
          )}{" "}
          Ficaram de fora: {s.tests_excluded} de teste, {s.courtesies_excluded} cortesias e {s.other_origin_excluded} de outra origem.
          {s.orders_without_paid_at > 0 &&
            ` ${s.orders_without_paid_at} vendas não têm a data do pagamento gravada e usam a data da criação (diferença de poucos minutos).`}
        </p>
      )}

      <MiniMetricGrid>
        <MiniMetricCard title="Vendas" value={s ? formatMeasure(s.orders, "orders") : "—"} icon={Receipt} />
        <MiniMetricCard title="Ingressos" value={s ? formatMeasure(s.tickets, "tickets") : "—"} icon={Ticket} />
        <MiniMetricCard title="Receita" value={s ? formatMeasure(s.revenue, "revenue") : "—"} icon={Wallet} />
        <MiniMetricCard title="Ticket médio" value={s ? formatMeasure(ticketAvg, "revenue") : "—"} subtext="Receita por venda" icon={TrendingUp} />
        <MiniMetricCard title="Eventos" value={s ? formatMeasure(s.events_count, "orders") : "—"} icon={CalendarDays} />
      </MiniMetricGrid>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <BreakdownSection dimension="dow" title="Vendas por dia da semana" filters={filters} measure={m} />
        <BreakdownSection dimension="hour_band" title="Vendas por faixa de horário" hint="Faixas de 4 horas." filters={filters} measure={m} />
        <BreakdownSection dimension="month_period" title="Vendas por período do mês" hint="Dia do mês em que a compra foi feita." filters={filters} measure={m} />
        <BreakdownSection
          dimension="business_day_5"
          title="Antes e depois do 5º dia útil"
          hint={state.countSaturday ? "Sábado conta como dia útil; domingos e feriados nacionais não." : "Só segunda a sexta; feriados nacionais não contam."}
          filters={filters}
          measure={m}
          extra={bd5Extra}
        />
        <BreakdownSection dimension="month_turn" title="Compras na virada do mês" hint="Últimos 3 e primeiros 3 dias do mês." filters={filters} measure={m} extra={turnExtra} />
      </div>

      <BreakdownSection
        dimension="lead_time"
        title={`Vendas por antecedência do evento (D-${state.leadMax} a D0)`}
        hint="D0 é o dia do evento; D-7, uma semana antes. Conta por dia de calendário."
        filters={filters}
        measure={m}
      />

      <InsightsCard
        title="Evolução diária das vendas"
        hint="Todos os dias entre a primeira e a última compra, inclusive os sem venda."
        sampleN={s?.orders ?? 0}
        loading={daily.isLoading}
        error={daily.isError}
        empty={!daily.isLoading && !daily.isError && (daily.data?.length ?? 0) === 0}
      >
        <DailyChart rows={daily.data ?? []} measure={m} />
      </InsightsCard>

      <InsightsCard
        title="Antecedência x dia da semana x período do mês"
        hint="Quanto mais forte o verde, mais vendas. Escolha um período do mês para cruzar com ele."
        sampleN={s?.orders ?? 0}
        loading={cross.isLoading}
        error={cross.isError}
        empty={!cross.isLoading && !cross.isError && (cross.data?.length ?? 0) === 0}
      >
        <CrossHeatmap rows={cross.data ?? []} measure={m} />
      </InsightsCard>
    </div>
  );
}
