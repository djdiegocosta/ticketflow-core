import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useNewCustomersCount(days: number = 30) {
  return useQuery({ queryKey: ["customers", "new-count", days], queryFn: async () => { const { data, error } = await supabase.rpc("get_new_customers_count", { _days: days }); if (error) throw error; return data as number; } });
}

export function useHourlySalesStats(eventId?: string) {
  return useQuery({ queryKey: ["sales", "hourly-stats", eventId], queryFn: async () => { const args: { _event_id?: string } = {}; if (eventId) args._event_id = eventId; const { data, error } = await supabase.rpc("get_hourly_sales_stats", args); if (error) throw error; return data as { hour: string; value: number }[]; } });
}

export const TEMPERATURE_THRESHOLDS = { aquecendo: 2, quente: 5, explodindo: 10 };
export type TemperatureLevel = "normal" | "aquecendo" | "quente" | "explodindo";
export function classifyTemperature(salesPerHour: number, thresholds = TEMPERATURE_THRESHOLDS): TemperatureLevel { if (salesPerHour >= thresholds.explodindo) return "explodindo"; if (salesPerHour >= thresholds.quente) return "quente"; if (salesPerHour >= thresholds.aquecendo) return "aquecendo"; return "normal"; }
export function salesVelocity(sales: { created_at: string; status: string; is_courtesy?: boolean }[], hours = 24) { const since = Date.now() - hours * 3600_000; const recent = sales.filter((s) => !s.is_courtesy && s.status === "pago" && new Date(s.created_at).getTime() >= since); return recent.length / hours; }

export function useAudienceStats(eventId?: string) {
  return useQuery({
    queryKey: ["customers", "audience-stats", eventId],
    queryFn: async () => {
      let salesQuery = supabase.from("sales").select("customer_id").eq("status", "pago");
      if (eventId) salesQuery = salesQuery.eq("event_id", eventId);
      const { data: paidSales, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      const customerIds = Array.from(new Set((paidSales ?? []).map((s) => s.customer_id).filter(Boolean))) as string[];
      const customersQuery = eventId
        ? customerIds.length > 0
          ? supabase.from("customers").select("id, data_nascimento, cidade, created_at").in("id", customerIds)
          : null
        : supabase.from("customers").select("id, data_nascimento, cidade, created_at");
      const { data: customers, error } = customersQuery ? await customersQuery : { data: [], error: null };
      if (error) throw error;

      const now = new Date();
      const ages: number[] = [];
      const cityMap = new Map<string, number>();
      let newCustomers = 0;
      (customers ?? []).forEach((c) => {
        if (c.data_nascimento) {
          const b = new Date(c.data_nascimento);
          let age = now.getFullYear() - b.getFullYear();
          if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
          if (age > 0 && age < 120) ages.push(age);
        }
        if (c.cidade) cityMap.set(c.cidade, (cityMap.get(c.cidade) ?? 0) + 1);
        if (now.getTime() - new Date(c.created_at).getTime() <= 30 * 24 * 3600_000) newCustomers++;
      });

      const purchases = new Map<string, number>();
      (paidSales ?? []).forEach((s) => { if (s.customer_id) purchases.set(s.customer_id, (purchases.get(s.customer_id) ?? 0) + 1); });
      const recurringCustomers = Array.from(purchases.values()).filter((n) => n > 1).length;
      const brackets = [{ label: "18-24", min: 18, max: 24 }, { label: "25-34", min: 25, max: 34 }, { label: "35-44", min: 35, max: 44 }, { label: "45+", min: 45, max: 200 }];
      let topBracket: string | null = null; let topBracketCount = 0;
      brackets.forEach((b) => { const count = ages.filter((a) => a >= b.min && a <= b.max).length; if (count > topBracketCount) { topBracketCount = count; topBracket = b.label; } });
      const topCities = Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([city, count]) => ({ city, count }));
      return { totalCustomers: (customers ?? []).length, averageAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null, topBracket, newCustomers, recurringCustomers, topCities };
    },
  });
}
