import { useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
} from "@/lib/insights-format";

const axisTick = { fontSize: 11, fill: "var(--text-secondary)" } as const;
const MUTED_BAR = "color-mix(in srgb, var(--accent) 40%, transparent)";

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

function TooltipBox({ active, payload, label }: { active?: boolean; payload?: ReadonlyArray<{ payload: Record<string, unknown> }>; label?: string }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  return (
    <div className="rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary px-3 py-2 text-small text-text-primary shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      <p>{formatMeasure(Number(p["orders"]), "orders")} vendas</p>
      <p>{formatMeasure(Number(p["tickets"]), "tickets")} ingressos</p>
      <p>{formatMeasure(Number(p["revenue"]), "revenue")}</p>
    </div>
  );
}

/** Barras por balde (dia da semana, horário, período do mês...). O maior balde fica em destaque. */
export function BreakdownBarChart({ rows, measure }: { rows: ReadonlyArray<BreakdownRow>; measure: Measure }) {
  const data = rows.map((r) => ({
    name: r.bucket,
    value: measureValue(r, measure),
    orders: r.orders,
    tickets: r.tickets,
    revenue: r.revenue,
  }));
  const top = topBucketIndex(data.map((d) => d.value));
  const wide = data.length > 8;
  return (
    <div className="w-full overflow-x-auto">
      <div className="h-[260px]" style={wide ? { minWidth: data.length * 42 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} interval={0} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={axisTick} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--bg-tertiary)" }} content={<TooltipBox />} />
            <Bar dataKey="value" name={MEASURE_LABEL[measure]} radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === top ? "var(--accent)" : MUTED_BAR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ddmm(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Evolução diária: por dia ou acumulada. */
export function DailyChart({ rows, measure }: { rows: ReadonlyArray<DailyRow>; measure: Measure }) {
  const [cumulative, setCumulative] = useState(false);
  const pick = (r: DailyRow): number =>
    measure === "orders"
      ? cumulative ? r.cum_orders : r.orders
      : measure === "tickets"
        ? cumulative ? r.cum_tickets : r.tickets
        : cumulative ? r.cum_revenue : r.revenue;
  const data = rows.map((r) => ({ name: ddmm(r.day), value: pick(r), orders: r.orders, tickets: r.tickets, revenue: r.revenue }));
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
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} minTickGap={24} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={axisTick} allowDecimals={false} />
            <Tooltip content={<TooltipBox />} />
            <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={1.5} fill="url(#insightsDaily)" />
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
                <th className="whitespace-nowrap p-1 text-left text-small font-medium text-text-primary">{band}</th>
                {DOW_LABELS.map((d, j) => {
                  const v = h.cells[i]?.[j] ?? 0;
                  return (
                    <td
                      key={d}
                      title={`${band} · ${d}: ${v} ${unit}`}
                      className="h-10 rounded-[var(--radius-sm)] font-semibold text-text-primary"
                      style={{ background: heatBackground(v, h.max) }}
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
