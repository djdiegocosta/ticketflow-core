import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrossRow, InsightsOrigin, SaleTiming } from "@/lib/insights-format";

// Consultas do painel TicketFlow Insights. As funções do banco (insights_sales_*) exigem papel admin
// e devolvem números já somados, sem dado pessoal.

export interface InsightsFilters {
  /** null = todos os eventos (consolidado) */
  eventIds: string[] | null;
  from: string | null;
  to: string | null;
  origin: InsightsOrigin;
  /** 5º dia útil conta sábado (regra de pagamento de salário) */
  countSaturday: boolean;
  /** janela de antecedência: D-N até D0 */
  leadMax: number;
  /** advance = D-N..D-1; event_day = D0; all = todas (inclui pós-evento) */
  timing: SaleTiming;
}

export type BreakdownDimension = "dow" | "hour_band" | "month_period" | "business_day_5" | "month_turn" | "lead_time";

export interface BreakdownRow {
  bucket: string;
  bucket_order: number;
  orders: number;
  tickets: number;
  revenue: number;
  event_day_orders: number;
  event_day_tickets: number;
  event_day_revenue: number;
  avg_orders_share: number;
  avg_tickets_share: number;
  avg_revenue_share: number;
  avg_event_day_orders_share: number;
  avg_event_day_tickets_share: number;
  avg_event_day_revenue_share: number;
}

export interface DailyRow {
  day: string;
  orders: number;
  tickets: number;
  revenue: number;
  cum_orders: number;
  cum_tickets: number;
  cum_revenue: number;
  event_day_orders: number;
  event_day_tickets: number;
  event_day_revenue: number;
  cum_event_day_orders: number;
  cum_event_day_tickets: number;
  cum_event_day_revenue: number;
}

export interface InsightsSummary {
  orders: number;
  tickets: number;
  revenue: number;
  events_count: number;
  first_date: string | null;
  last_date: string | null;
  orders_without_paid_at: number;
  tests_excluded: number;
  courtesies_excluded: number;
  other_origin_excluded: number;
}

function baseArgs(f: InsightsFilters) {
  return {
    _event_ids: f.eventIds,
    _from: f.from,
    _to: f.to,
    _origin: f.origin,
    _count_saturday: f.countSaturday,
    _timing: f.timing,
  };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return (data ?? []) as T[];
}

const STALE = 60_000;

export function useInsightsSummary(f: InsightsFilters) {
  return useQuery({
    queryKey: ["insights", "summary", f],
    staleTime: STALE,
    queryFn: async (): Promise<InsightsSummary> => {
      const [r] = await call<Record<string, unknown>>("insights_sales_summary", { ...baseArgs(f), _lead_max: f.leadMax });
      return {
        orders: num(r?.["orders"]),
        tickets: num(r?.["tickets"]),
        revenue: num(r?.["revenue"]),
        events_count: num(r?.["events_count"]),
        first_date: (r?.["first_date"] as string | null) ?? null,
        last_date: (r?.["last_date"] as string | null) ?? null,
        orders_without_paid_at: num(r?.["orders_without_paid_at"]),
        tests_excluded: num(r?.["tests_excluded"]),
        courtesies_excluded: num(r?.["courtesies_excluded"]),
        other_origin_excluded: num(r?.["other_origin_excluded"]),
      };
    },
  });
}

export function useInsightsBreakdown(dimension: BreakdownDimension, f: InsightsFilters) {
  return useQuery({
    queryKey: ["insights", "breakdown", dimension, f],
    staleTime: STALE,
    queryFn: async (): Promise<BreakdownRow[]> => {
      const rows = await call<Record<string, unknown>>("insights_sales_breakdown", {
        _dimension: dimension,
        ...baseArgs(f),
        _lead_max: f.leadMax,
      });
      return rows.map((r) => ({
        bucket: String(r["bucket"]),
        bucket_order: num(r["bucket_order"]),
        orders: num(r["orders"]),
        tickets: num(r["tickets"]),
        revenue: num(r["revenue"]),
        event_day_orders: num(r["event_day_orders"]),
        event_day_tickets: num(r["event_day_tickets"]),
        event_day_revenue: num(r["event_day_revenue"]),
        avg_orders_share: num(r["avg_orders_share"]),
        avg_tickets_share: num(r["avg_tickets_share"]),
        avg_revenue_share: num(r["avg_revenue_share"]),
        avg_event_day_orders_share: num(r["avg_event_day_orders_share"]),
        avg_event_day_tickets_share: num(r["avg_event_day_tickets_share"]),
        avg_event_day_revenue_share: num(r["avg_event_day_revenue_share"]),
      }));
    },
  });
}

export function useInsightsDaily(f: InsightsFilters, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["insights", "daily", f],
    staleTime: STALE,
    queryFn: async (): Promise<DailyRow[]> => {
      const rows = await call<Record<string, unknown>>("insights_sales_daily", { ...baseArgs(f), _lead_max: f.leadMax });
      return rows.map((r) => ({
        day: String(r["day"]),
        orders: num(r["orders"]),
        tickets: num(r["tickets"]),
        revenue: num(r["revenue"]),
        cum_orders: num(r["cum_orders"]),
        cum_tickets: num(r["cum_tickets"]),
        cum_revenue: num(r["cum_revenue"]),
        event_day_orders: num(r["event_day_orders"]),
        event_day_tickets: num(r["event_day_tickets"]),
        event_day_revenue: num(r["event_day_revenue"]),
        cum_event_day_orders: num(r["cum_event_day_orders"]),
        cum_event_day_tickets: num(r["cum_event_day_tickets"]),
        cum_event_day_revenue: num(r["cum_event_day_revenue"]),
      }));
    },
  });
}

export function useInsightsCross(f: InsightsFilters, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["insights", "cross", f],
    staleTime: STALE,
    queryFn: async (): Promise<CrossRow[]> => {
      const rows = await call<Record<string, unknown>>("insights_sales_cross", baseArgs(f));
      return rows.map((r) => ({
        lead_band: String(r["lead_band"]),
        lead_band_order: num(r["lead_band_order"]),
        dow: num(r["dow"]),
        dow_label: String(r["dow_label"]),
        month_period: String(r["month_period"]),
        month_period_order: num(r["month_period_order"]),
        orders: num(r["orders"]),
        tickets: num(r["tickets"]),
      }));
    },
  });
}
