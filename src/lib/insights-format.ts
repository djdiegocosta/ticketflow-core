// TicketFlow Insights — funções puras (sem rede) do painel: períodos, medidas, formatação e mapa de calor.
// Os cálculos pesados (dia da semana, horário, 5º dia útil, antecedência...) ficam no banco; aqui só se apresenta.

export type Measure = "orders" | "tickets" | "revenue";
export type SaleTiming = "advance" | "event_day" | "all";
export type PeriodPreset = "all" | "30d" | "90d" | "custom";
export type InsightsOrigin = "online" | "manual" | "all";

export const MEASURE_LABEL: Record<Measure, string> = { orders: "Vendas", tickets: "Ingressos", revenue: "Receita" };
export const LEAD_BANDS = ["D-20 a D-15", "D-14 a D-8", "D-7 a D-4", "D-3 a D-1", "D0"] as const;
export const DOW_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
export const MONTH_PERIODS = ["1 a 5", "6 a 10", "11 a 15", "16 a 20", "21 a 25", "26 a 31"] as const;

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface MeasureRow {
  orders: number;
  tickets: number;
  revenue: number;
}

export interface CrossRow {
  lead_band: string;
  lead_band_order: number;
  dow: number;
  dow_label: string;
  month_period: string;
  month_period_order: number;
  orders: number;
  tickets: number;
}

/** Data (AAAA-MM-DD) no horário de Brasília. */
export function brtDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

/** Período rápido: "all" e "custom" não limitam aqui (custom vem dos campos de data). */
export function periodRange(preset: PeriodPreset, now: Date = new Date()): DateRange {
  if (preset === "all" || preset === "custom") return { from: null, to: null };
  const days = preset === "30d" ? 30 : 90;
  return { from: brtDateString(new Date(now.getTime() - (days - 1) * 86_400_000)), to: brtDateString(now) };
}

export function sharePercent(part: number, total: number): string {
  if (!(total > 0)) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

export function measureValue(row: MeasureRow, measure: Measure): number {
  return row[measure];
}

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMeasure(value: number, measure: Measure): string {
  return measure === "revenue" ? brl.format(value) : nf.format(value);
}

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Número exibido no topo de cada barra (o tooltip continua mostrando o detalhe completo).
 * - zero mostra "0" (barra vazia fica explícita); valor inválido ou negativo não mostra nada;
 * - ingressos/vendas: número inteiro;
 * - receita: forma compacta ("1,2 mil"), para caber em cima de barras estreitas;
 * - média por evento: porcentagem com até 1 casa decimal.
 */
export function formatBarLabel(value: number, measure: Measure, normalized = false): string {
  if (!Number.isFinite(value) || value < 0) return "";
  if (value === 0) return normalized ? "0%" : "0";
  if (normalized) return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  if (measure === "revenue") return compact.format(value);
  return nf.format(value);
}

/** Posição do maior valor (o primeiro, em empate); -1 se tudo for zero. */
export function topBucketIndex(values: ReadonlyArray<number>): number {
  let best = -1;
  let max = 0;
  values.forEach((v, i) => {
    if (v > max) {
      max = v;
      best = i;
    }
  });
  return best;
}

/** Aviso de amostra pequena: com poucas vendas, qualquer padrão pode ser acaso. */
export function lowSampleNote(n: number, threshold = 30): string | null {
  if (n <= 0) return null;
  return n < threshold ? `Amostra pequena (${n} ${n === 1 ? "venda" : "vendas"}): leia como tendência, não como regra.` : null;
}

export interface Heatmap {
  /** linhas = faixas de antecedência (LEAD_BANDS), colunas = dias da semana (DOW_LABELS) */
  cells: number[][];
  max: number;
  total: number;
  /** vendas fora de D-20..D0 (muito antes ou pós-evento), que não aparecem na grade */
  outside: number;
}

/** Monta a grade antecedência x dia da semana, opcionalmente só de um período do mês. */
export function buildHeatmap(rows: ReadonlyArray<CrossRow>, measure: Measure, period: string): Heatmap {
  const cells = LEAD_BANDS.map(() => DOW_LABELS.map(() => 0));
  let outside = 0;
  for (const r of rows) {
    if (period !== "all" && r.month_period !== period) continue;
    const value = measure === "tickets" ? r.tickets : r.orders; // a receita não é cruzada: usa vendas
    const i = LEAD_BANDS.indexOf(r.lead_band as (typeof LEAD_BANDS)[number]);
    const j = r.dow - 1;
    const line = i >= 0 ? cells[i] : undefined;
    if (line && j >= 0 && j < line.length) line[j] = (line[j] ?? 0) + value;
    else outside += value;
  }
  const flat = cells.flat();
  return { cells, max: Math.max(0, ...flat), total: flat.reduce((a, b) => a + b, 0), outside };
}

/** Cor de fundo da célula: o verde do sistema com intensidade proporcional ao valor. */
export function heatBackground(value: number, max: number): string {
  if (!(max > 0) || !(value > 0)) return "transparent";
  const pct = Math.round(15 + (value / max) * 70);
  return `color-mix(in srgb, var(--accent) ${pct}%, transparent)`;
}
