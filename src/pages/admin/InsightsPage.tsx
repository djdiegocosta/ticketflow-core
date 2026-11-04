import { useMemo, useState } from "react";
import { CalendarDays, Lock, Receipt, Ticket } from "lucide-react";
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
import { formatMeasure, lowSampleNote, periodRange, sharePercent, type Measure } from "@/lib/insights-format";

type CalendarDimension = "month_period" | "business_day_5" | "month_turn";

function brDate(iso: string | null): string {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—";
}

function topBucket(rows: ReadonlyArray<BreakdownRow>, measure: Measure): BreakdownRow | null {
  return rows.reduce<BreakdownRow | null>((best, row) => {
    if (!best || row[measure] > best[measure]) return row;
    return best;
  }, null);
}

function BreakdownSection({
  dimension,
  title,
  hint,
  filters,
  measure,
  extra,
  showNormalizedToggle = false,
  normalized = false,
  onNormalizedChange,
}: {
  dimension: BreakdownDimension;
  title: string;
  hint?: string;
  filters: QueryFilters;
  measure: Measure;
  extra?: (rows: ReadonlyArray<BreakdownRow>) => string | null;
  showNormalizedToggle?: boolean;
  normalized?: boolean;
  onNormalizedChange?: (next: boolean) => void;
}) {
  const query = useInsightsBreakdown(dimension, filters);
  const rows = query.data ?? [];
  const total = rows.reduce((sum, row) => sum + row.orders, 0);
  const note = extra ? extra(rows) : null;

  return (
    <InsightsCard
      title={title}
      {...(hint ? { hint } : {})}
      sampleN={total}
      loading={query.isLoading}
      error={query.isError}
      empty={!query.isLoading && !query.isError && total === 0}
    >
      {showNormalizedToggle && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNormalizedChange?.(false)}
            aria-pressed={!normalized}
            className={
              !normalized
                ? "rounded-[var(--radius-sm)] bg-accent-muted px-3 py-1.5 text-small font-semibold text-accent-text"
                : "rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-3 py-1.5 text-small text-text-primary"
            }
          >
            Volume total
          </button>
          <button
            type="button"
            onClick={() => onNormalizedChange?.(true)}
            aria-pressed={normalized}
            className={
              normalized
                ? "rounded-[var(--radius-sm)] bg-accent-muted px-3 py-1.5 text-small font-semibold text-accent-text"
                : "rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-3 py-1.5 text-small text-text-primary"
            }
          >
            Média por evento
          </button>
        </div>
      )}
      <BreakdownBarChart rows={rows} measure={measure} timing={filters.timing} normalized={normalized} />
      {normalized && (
        <p className="text-micro text-text-secondary">
          Cada evento com vendas neste filtro tem o mesmo peso. O gráfico mostra a participação média de cada dia da semana.
        </p>
      )}
      {note && <p className="pt-1 text-small font-medium text-text-primary">{note}</p>}
    </InsightsCard>
  );
}

function CalendarDimensionTabs({
  value,
  onChange,
}: {
  value: CalendarDimension;
  onChange: (dimension: CalendarDimension) => void;
}) {
  const options: ReadonlyArray<{ value: CalendarDimension; label: string }> = [
    { value: "month_period", label: "Período do mês" },
    { value: "business_day_5", label: "5º dia útil" },
    { value: "month_turn", label: "Virada do mês" },
  ];
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Análises do calendário">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={
            value === option.value
              ? "rounded-[var(--radius-sm)] bg-accent-muted px-3 py-2 text-small font-semibold text-accent-text"
              : "rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-3 py-2 text-small text-text-primary"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
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
    timing: "advance",
  });
  const [weekdayAverage, setWeekdayAverage] = useState(false);
  const [calendarDimension, setCalendarDimension] = useState<CalendarDimension>("month_period");
  const [detailsOpen, setDetailsOpen] = useState(false);

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
      timing: state.timing,
    };
  }, [state]);

  const summary = useInsightsSummary(filters);
  const weekdayQuery = useInsightsBreakdown("dow", filters);
  const hourQuery = useInsightsBreakdown("hour_band", filters);
  const cross = useInsightsCross(filters, detailsOpen);
  const daily = useInsightsDaily(filters, detailsOpen && state.eventSel !== "all");

  if (!authLoading && userRole !== "admin") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
        <Lock className="h-8 w-8 text-text-secondary" />
        <p className="text-body text-text-primary">O Insights é exclusivo para administradores.</p>
      </div>
    );
  }

  const result = summary.data;
  const eventList = (events ?? []).map((event) => ({ id: event.id, title: event.title }));
  const measure = state.measure;
  const consolidated = state.eventSel === "all";
  const weekdayRows = weekdayQuery.data ?? [];
  const hourRows = hourQuery.data ?? [];
  const bestDay = topBucket(weekdayRows, measure);
  const bestHour = topBucket(hourRows, measure);
  const sampleNote = lowSampleNote(result?.orders ?? 0);

  const calendarExtra = (rows: ReadonlyArray<BreakdownRow>) => {
    const total = rows.reduce((sum, row) => sum + row[measure], 0);
    if (total <= 0) return null;

    if (calendarDimension === "business_day_5") {
      const before = rows.find((row) => row.bucket.startsWith("Até"))?.[measure] ?? 0;
      return `${sharePercent(before, total)} das compras acontecem até o 5º dia útil; ${sharePercent(total - before, total)} depois.`;
    }

    if (calendarDimension === "month_turn") {
      const turn = rows.filter((row) => !row.bucket.startsWith("Meio")).reduce((sum, row) => sum + row[measure], 0);
      return `${sharePercent(turn, total)} das compras se concentram na virada do mês (3 primeiros e 3 últimos dias).`;
    }

    const top = topBucket(rows, measure);
    return top ? `Maior concentração observada: dias ${top.bucket} do mês (${sharePercent(top[measure], total)} das compras).` : null;
  };

  const calendarTitle: Record<CalendarDimension, string> = {
    month_period: "Compras por período do mês",
    business_day_5: "Compras até e depois do 5º dia útil",
    month_turn: "Compras na virada do mês",
  };

  const leadTitle =
    state.timing === "advance"
      ? `Quando o público compra antes do evento (D-${state.leadMax} a D-1)`
      : state.timing === "event_day"
        ? "Compras feitas na data do evento (D0)"
        : `Compras por antecedência (D-${state.leadMax} a D0)`;

  const timingLabel =
    state.timing === "advance"
      ? "compras antecipadas"
      : state.timing === "event_day"
        ? "compras no dia do evento"
        : "todas as compras";

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-heading-1 font-bold text-text-primary">TicketFlow Insights</h1>
        <p className="text-small text-text-secondary">
          Padrões de compra para orientar o calendário de divulgação dos eventos.
        </p>
      </header>

      <InsightsFilters
        state={state}
        onChange={(patch) => setState((previous) => ({ ...previous, ...patch }))}
        events={eventList}
      />

      <section className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-heading-3 font-semibold text-text-primary">Visão geral</h2>
          <p className="text-micro text-text-secondary">
            {result?.orders ? `${result.orders} vendas · ${result.events_count} eventos` : "Sem vendas neste filtro"}
            {result?.first_date && result?.last_date ? ` · ${brDate(result.first_date)} a ${brDate(result.last_date)}` : ""}
          </p>
        </div>
        <MiniMetricGrid className="sm:grid-cols-3 xl:grid-cols-3">
          <MiniMetricCard title="Vendas pagas" value={result ? formatMeasure(result.orders, "orders") : "—"} icon={Receipt} />
          <MiniMetricCard title="Ingressos vendidos" value={result ? formatMeasure(result.tickets, "tickets") : "—"} icon={Ticket} />
          <MiniMetricCard title="Eventos analisados" value={result ? formatMeasure(result.events_count, "orders") : "—"} icon={CalendarDays} />
        </MiniMetricGrid>
        {result && (
          <p className="text-micro text-text-secondary">
            Receita líquida contabilizada: {formatMeasure(result.revenue, "revenue")}
            {result.orders > 0 ? ` · ticket médio ${formatMeasure(result.revenue / result.orders, "revenue")}` : ""}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-heading-2 font-semibold text-text-primary">Quando o público costuma comprar?</h2>
          <p className="text-small text-text-secondary">
            Comparação de {timingLabel}. {consolidated ? "No histórico consolidado, a média por evento evita que uma única festa concentre todo o peso." : "Os resultados consideram apenas o evento selecionado."}
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <InsightsCard
            title="Dia da semana"
            hint={
              state.timing === "all"
                ? "D0 aparece em laranja; as demais compras ficam em verde."
                : state.timing === "event_day"
                  ? "Compras feitas na data local da festa."
                  : "Compras antecipadas, de D-N até D-1."
            }
            sampleN={result?.orders ?? 0}
            loading={weekdayQuery.isLoading}
            error={weekdayQuery.isError}
            empty={!weekdayQuery.isLoading && !weekdayQuery.isError && weekdayRows.every((row) => row.orders === 0)}
          >
            <div className="flex h-8 flex-wrap items-center gap-2">
              {consolidated && (
                <>
                <button
                  type="button"
                  aria-pressed={!weekdayAverage}
                  onClick={() => setWeekdayAverage(false)}
                  className={
                    !weekdayAverage
                      ? "rounded-[var(--radius-sm)] bg-accent-muted px-3 py-1.5 text-small font-semibold text-accent-text"
                      : "rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-3 py-1.5 text-small text-text-primary"
                  }
                >
                  Volume total
                </button>
                <button
                  type="button"
                  aria-pressed={weekdayAverage}
                  onClick={() => setWeekdayAverage(true)}
                  className={
                    weekdayAverage
                      ? "rounded-[var(--radius-sm)] bg-accent-muted px-3 py-1.5 text-small font-semibold text-accent-text"
                      : "rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-3 py-1.5 text-small text-text-primary"
                  }
                >
                  Média por evento
                </button>
                </>
              )}
            </div>
            <BreakdownBarChart rows={weekdayRows} measure={measure} timing={state.timing} normalized={consolidated && weekdayAverage} />
          </InsightsCard>

          <InsightsCard
            title="Faixa de horário"
            hint="Compras agrupadas em períodos de quatro horas, no horário de Brasília."
            sampleN={result?.orders ?? 0}
            loading={hourQuery.isLoading}
            error={hourQuery.isError}
            empty={!hourQuery.isLoading && !hourQuery.isError && hourRows.every((row) => row.orders === 0)}
          >
            <div className="hidden h-8 lg:block" aria-hidden="true" />
            <BreakdownBarChart rows={hourRows} measure={measure} timing={state.timing} />
          </InsightsCard>
        </div>

        {result && result.orders > 0 && (
          <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary px-4 py-3">
            {result.orders < 30 ? (
              <p className="text-small text-text-secondary">
                {sampleNote} O padrão mais alto até agora aparece em {bestDay?.bucket ?? "—"} e na faixa {bestHour?.bucket ?? "—"}.
              </p>
            ) : (
              <p className="text-small text-text-primary">
                <span className="font-semibold">Sinal do histórico:</span> maior concentração em {bestDay?.bucket ?? "—"} e na faixa {bestHour?.bucket ?? "—"}.
                <span className="text-text-secondary"> É uma referência para testar horários de divulgação, não uma garantia de vendas futuras.</span>
              </p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-heading-2 font-semibold text-text-primary">O calendário do mês influencia?</h2>
          <p className="text-small text-text-secondary">
            Veja se as compras se concentram em determinados dias do mês, perto do 5º dia útil ou na virada.
          </p>
        </div>
        <CalendarDimensionTabs value={calendarDimension} onChange={setCalendarDimension} />
        <BreakdownSection
          dimension={calendarDimension}
          title={calendarTitle[calendarDimension]}
          hint={
            calendarDimension === "business_day_5"
              ? state.countSaturday
                ? "Sábado conta como dia útil; domingo e feriado nacional não contam."
                : "Só segunda a sexta; feriados nacionais não contam."
              : calendarDimension === "month_turn"
                ? "Considera os três primeiros e os três últimos dias de cada mês."
                : "Agrupa a data da compra em intervalos de cinco dias."
          }
          filters={filters}
          measure={measure}
          extra={calendarExtra}
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-heading-2 font-semibold text-text-primary">Qual é a janela de divulgação mais importante?</h2>
          <p className="text-small text-text-secondary">
            A distribuição das compras antes da festa mostra quando a divulgação precisa estar ativa.
          </p>
        </div>
        <BreakdownSection
          dimension="lead_time"
          title={leadTitle}
          hint="D0 é a data local de cada evento. D-7 é uma semana antes; D-1 é a véspera."
          filters={filters}
          measure={measure}
        />
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-border-default bg-bg-secondary px-4 py-3 text-left"
        >
          <span>
            <span className="block text-small font-semibold text-text-primary">Análises detalhadas</span>
            <span className="block text-micro text-text-secondary">Cruzamento de antecedência, dia da semana e evolução das vendas</span>
          </span>
          <span className="text-small font-medium text-accent-text">{detailsOpen ? "Ocultar" : "Abrir"}</span>
        </button>

        {detailsOpen && (
          <div className="space-y-4">
            <InsightsCard
              title="Antecedência x dia da semana x período do mês"
              hint="O cruzamento mantém a janela fixa D-20 a D0. D0 aparece em laranja."
              sampleN={result?.orders ?? 0}
              loading={cross.isLoading}
              error={cross.isError}
              empty={!cross.isLoading && !cross.isError && (cross.data?.length ?? 0) === 0}
            >
              <CrossHeatmap rows={cross.data ?? []} measure={measure} />
            </InsightsCard>

            {state.eventSel !== "all" ? (
              <InsightsCard
                title="Evolução diária do evento"
                hint="Vendas por data do calendário, incluindo dias sem compra."
                sampleN={result?.orders ?? 0}
                loading={daily.isLoading}
                error={daily.isError}
                empty={!daily.isLoading && !daily.isError && (daily.data?.length ?? 0) === 0}
              >
                <DailyChart rows={daily.data ?? []} measure={measure} timing={state.timing} />
              </InsightsCard>
            ) : (
              <p className="text-micro text-text-secondary">
                Para ver a evolução por data de calendário sem misturar festas realizadas em meses diferentes, selecione um evento específico.
              </p>
            )}
          </div>
        )}
      </section>

      <details className="rounded-[var(--radius-md)] bg-bg-secondary px-4 py-3">
        <summary className="cursor-pointer text-small font-medium text-text-secondary">
          Critérios e cobertura dos dados
        </summary>
        <div className="space-y-2 pt-3 text-micro text-text-secondary">
          <p>Entram somente vendas pagas, sem cortesia e sem teste. A data usada é a do pagamento; quando não existe, usamos a data de criação. Todos os horários seguem Brasília.</p>
          {result && (
            <p>
              Neste filtro: {result.tests_excluded} vendas de teste, {result.courtesies_excluded} cortesias e {result.other_origin_excluded} vendas de outra origem ficaram fora.
              {result.orders_without_paid_at > 0 ? ` ${result.orders_without_paid_at} vendas não têm paid_at gravado.` : ""}
            </p>
          )}
          <p>O 5º dia útil usa feriados nacionais cadastrados no calendário do sistema. Feriados estaduais, municipais e pontos facultativos podem não estar incluídos.</p>
          <p>Com menos de 30 vendas, os resultados devem ser lidos como tendência, não como regra estatística.</p>
        </div>
      </details>
    </div>
  );
}
