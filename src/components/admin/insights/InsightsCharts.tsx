import { useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { BreakdownRow, DailyRow } from "@/lib/insights-queries";
import {
  DOW_LABELS,
  LEAD_BANDS,
  MEASURE_LABEL,
  MONTH_PERIODS,
  buildHeatmap,
  formatMeasure,
  heatBackground,
  lowSampleNote,
  measureValue,
  topBucketIndex,
  type CrossRow,
  type Measure,
  type SaleTiming,
} from "@/lib/insights-format";

const axisTick = { fontSize: 11, fill: "var(--text-secondary)" } as const;
const EVENT_DAY_COLOR = "#D97745";

function eventDayValue(row: BreakdownRow | DailyRow, measure: Measure): number {
  return measure === "orders"
    ? row.event_day_orders
    : measure === "tickets"
      ? row.event_day_tickets
      : row.event_day_revenue;
}

function averageShare(row: BreakdownRow, measure: Measure): number {
  return measure === "orders"
    ? row.avg_orders_share
    : measure === "tickets"
      ? row.avg_tickets_share
      : row.avg_revenue_share;
}

function averageEventDayShare(row: BreakdownRow, measure: Measure): number {
  return measure === "orders"
    ? row.avg_event_day_orders_share
    : measure === "tickets"
      ? row.avg_event_day_tickets_share
      : row.avg_event_day_revenue_share;
}

/** Cartão padrão dos gráficos: título, explicação, aviso de amostra pequena e estados de carregando/erro/vazio. */
export function InsightsCard({
  title,
  hint,
  sampleN,
  loading,
  error,
  empty,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  sampleN?: number;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const note = sampleN !== undefined ? lowSampleNote(sampleN) : null;
  return (
    <section className={`flex h-full min-w-0 flex-col gap-3 rounded-[var(--radius-md)] bg-bg-secondary p-4 sm:p-6 ${className}`}>
      <header className="space-y-1">
        <h2 className="text-heading-3 font-semibold text-text-primary">{title}</h2>
        {hint && <p className="text-small text-text-secondary">{hint}</p>}
      </header>
      {loading ? (
        <Skeleton className="h-[240px] w-full" />
      ) : error ? (
        <p className="py-10 text-center text-small text-text-secondary">Não foi possível carregar este gráfico. Tente atualizar a página.</p>
      ) : empty ? (
        <p className="py-10 text-center text-small text-text-secondary">Sem vendas neste filtro.</p>
      ) : (
        children
      )}
      {note && !loading && !error && !empty && <p className="text-micro text-text-secondary">{note}</p>}
    </section>
  );
}

function TooltipBox({
  active,
  payload,
  label,
  normalized = false,
  showTiming = false,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: Record<string, unknown> }>;
  label?: string;
  normalized?: boolean;
  showTiming?: boolean;
}) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;

  const value = Number(p["value"] ?? 0);
  const d0 = Number(p["eventDayValue"] ?? 0);
  const other = Math.max(0, value - d0);
  const measure: Measure =
    p["measure"] === "revenue" ? "revenue" : p["measure"] === "tickets" ? "tickets" : "orders";

  return (
    <div className="rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary px-3 py-2 text-small text-text-primary shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {normalized ? (
        <>
          <p>Participação média: {value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</p>
          {showTiming && (
            <>
              <p className="text-text-secondary">D0: {d0.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</p>
              <p className="text-text-secondary">Outras datas: {other.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</p>
            </>
          )}
        </>
      ) : (
        <>
          <p>{formatMeasure(Number(p["orders"]), "orders")} vendas</p>
          <p>{formatMeasure(Number(p["tickets"]), "tickets")} ingressos</p>
          <p>{formatMeasure(Number(p["revenue"]), "revenue")}</p>
          {showTiming && (
            <>
              <p className="mt-1 text-text-secondary">Dia do evento (D0): {formatMeasure(d0, measure)}</p>
              <p className="text-text-secondary">Outras datas: {formatMeasure(other, measure)}</p>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Barras por balde. Em "Todas", D0 fica separado; no consolidado, também permite média normalizada por evento. */
export function BreakdownBarChart({
  rows,
  measure,
  timing,
  normalized = false,
}: {
  rows: ReadonlyArray<BreakdownRow>;
  measure: Measure;
  timing: SaleTiming;
  normalized?: boolean;
}) {
  const data = rows.map((r) => {
    const total = normalized ? averageShare(r, measure) : measureValue(r, measure);
    const d0 = normalized ? averageEventDayShare(r, measure) : eventDayValue(r, measure);
    return {
      name: r.bucket,
      value: total,
      otherValue: Math.max(0, total - d0),
      eventDayValue: d0,
      orders: r.orders,
      tickets: r.tickets,
      revenue: r.revenue,
      eventDayOrders: r.event_day_orders,
      eventDayTickets: r.event_day_tickets,
      eventDayRevenue: r.event_day_revenue,
      measure,
    };
  });
  const top = topBucketIndex(data.map((d) => d.value));
  const wide = data.length > 8;
  const hasD0 = timing === "all" && data.some((d) => d.eventDayValue > 0);
  const singleColor = timing === "event_day" ? EVENT_DAY_COLOR : undefined;

  return (
    <div className="w-full overflow-x-auto">
      <div className="h-[260px]" style={wide ? { minWidth: data.length * 42 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} interval={0} dy={8} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              allowDecimals={normalized}
              {...(normalized ? { tickFormatter: (v: number) => `${v}%` } : {})}
            />
            <Tooltip cursor={{ fill: "var(--bg-tertiary)" }} content={<TooltipBox normalized={normalized} showTiming={hasD0} />} />
            {hasD0 ? (
              <>
                <Legend />
                <Bar dataKey="otherValue" name="Outras datas" stackId="timing" fill="var(--accent)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="eventDayValue" name="Dia do evento (D0)" stackId="timing" fill={EVENT_DAY_COLOR} radius={[4, 4, 0, 0]} />
              </>
            ) : (
              <Bar dataKey="value" name={normalized ? "Participação média" : MEASURE_LABEL[measure]} fill={singleColor}>
                {data.map((_, i) => (
                  <Cell key={i} fill={singleColor ?? (i === top ? "var(--accent)" : MUTED_BAR)} />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ddmm(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Evolução diária, com a parcela D0 destacada no modo Todas. */
export function DailyChart({ rows, measure, timing }: { rows: ReadonlyArray<DailyRow>; measure: Measure; timing: SaleTiming }) {
  const [cumulative, setCumulative] = useState(false);
  const pick = (r: DailyRow): number =>
    measure === "orders"
      ? cumulative ? r.cum_orders : r.orders
      : measure === "tickets"
        ? cumulative ? r.cum_tickets : r.tickets
        : cumulative ? r.cum_revenue : r.revenue;
  const pickD0 = (r: DailyRow): number =>
    measure === "orders"
      ? cumulative ? r.cum_event_day_orders : r.event_day_orders
      : measure === "tickets"
        ? cumulative ? r.cum_event_day_tickets : r.event_day_tickets
        : cumulative ? r.cum_event_day_revenue : r.event_day_revenue;

  const data = rows.map((r) => {
    const value = pick(r);
    const d0 = pickD0(r);
    return {
      name: ddmm(r.day),
      value,
      otherValue: Math.max(0, value - d0),
      eventDayValue: d0,
      orders: cumulative ? r.cum_orders : r.orders,
      tickets: cumulative ? r.cum_tickets : r.tickets,
      revenue: cumulative ? r.cum_revenue : r.revenue,
      eventDayOrders: cumulative ? r.cum_event_day_orders : r.event_day_orders,
      eventDayTickets: cumulative ? r.cum_event_day_tickets : r.event_day_tickets,
      eventDayRevenue: cumulative ? r.cum_event_day_revenue : r.event_day_revenue,
      measure,
    };
  });
  const hasD0 = timing === "all" && data.some((d) => d.eventDayValue > 0);
  const color = timing === "event_day" ? EVENT_DAY_COLOR : "var(--accent)";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {([false, true] as const).map((c) => (
          <button
            key={String(c)}
            type="button"
            onClick={() => setCumulative(c)}
            className={
              cumulative === c
                ? "rounded-[var(--radius-sm)] bg-accent-muted px-3 py-1.5 text-small font-semibold text-accent-text"
                : "rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-3 py-1.5 text-small text-text-primary"
            }
          >
            {c ? "Acumulado" : "Por dia"}
          </button>
        ))}
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="insightsDaily" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="insightsDailyD0" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={EVENT_DAY_COLOR} stopOpacity={0.35} />
                <stop offset="95%" stopColor={EVENT_DAY_COLOR} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} minTickGap={24} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={axisTick} allowDecimals={false} />
            <Tooltip content={<TooltipBox showTiming={hasD0} />} />
            {hasD0 ? (
              <>
                <Legend />
                <Area type="monotone" dataKey="otherValue" name="Outras datas" stackId="sales" stroke="var(--accent)" strokeWidth={1.5} fill="url(#insightsDaily)" />
                <Area type="monotone" dataKey="eventDayValue" name="Dia do evento (D0)" stackId="sales" stroke={EVENT_DAY_COLOR} strokeWidth={1.5} fill="url(#insightsDailyD0)" />
              </>
            ) : (
              <Area type="monotone" dataKey="value" name={MEASURE_LABEL[measure]} stroke={color} strokeWidth={1.5} fill="url(#insightsDaily)" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Mapa de calor: antecedência (D-20 a D0) x dia da semana, com filtro por período do mês. */
export function CrossHeatmap({ rows, measure }: { rows: ReadonlyArray<CrossRow>; measure: Measure }) {
  const [period, setPeriod] = useState<string>("all");
  const h = buildHeatmap(rows, measure, period);
  const unit = measure === "tickets" ? "ingressos" : "vendas";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["all", ...MONTH_PERIODS].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={
              period === p
                ? "rounded-[var(--radius-sm)] bg-accent-muted px-3 py-1.5 text-small font-semibold text-accent-text"
                : "rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-3 py-1.5 text-small text-text-primary"
            }
          >
            {p === "all" ? "Mês todo" : `Dia ${p}`}
          </button>
        ))}
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1 text-center text-small">
          <thead>
            <tr>
              <th className="p-1 text-left text-micro font-medium uppercase tracking-wide text-text-secondary">Antecedência</th>
              {DOW_LABELS.map((d) => (
                <th key={d} className="p-1 text-micro font-medium uppercase tracking-wide text-text-secondary">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEAD_BANDS.map((band, i) => (
              <tr key={band}>
                <th className={`whitespace-nowrap p-1 text-left text-small font-medium ${i === 4 ? "text-[#D97745]" : "text-text-primary"}`}>{i === 4 ? "D0 · Evento" : band}</th>
                {DOW_LABELS.map((d, j) => {
                  const v = h.cells[i]?.[j] ?? 0;
                  return (
                    <td
                      key={d}
                      title={`${band} · ${d}: ${v} ${unit}`}
                      className="h-10 rounded-[var(--radius-sm)] font-semibold text-text-primary"
                      style={{
                        background:
                          i === 4 && v > 0 && h.max > 0
                            ? `color-mix(in srgb, ${EVENT_DAY_COLOR} ${Math.round(15 + (v / h.max) * 70)}%, transparent)`
                            : heatBackground(v, h.max),
                      }}
                    >
                      {v > 0 ? v : <span className="text-text-disabled">·</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-micro text-text-secondary">
        {h.total} {unit} na grade{h.outside > 0 ? `; ${h.outside} fora de D-20 a D0 (muito antes ou depois do evento) não aparecem aqui` : ""}.
        {measure === "revenue" ? " A grade conta vendas, não receita." : ""}
      </p>
    </div>
  );
}
