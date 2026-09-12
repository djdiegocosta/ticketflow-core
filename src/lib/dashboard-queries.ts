import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";
import { useOperationalPreferences } from "./settings-queries";

export function useNewCustomersCount(days: number = 30) {
  const { user, organizationId, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["customers", "new-count", organizationId, user?.id, days],
    enabled: !authLoading && !!user && !!organizationId,
    queryFn: async () => { const { data, error } = await supabase.rpc("get_new_customers_count", { _days: days }); if (error) throw error; return data as number; },
  });
}

export function useHourlySalesStats(eventId?: string) {
  const { user, organizationId, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["sales", "hourly-stats", organizationId, user?.id, eventId],
    enabled: !authLoading && !!user && !!organizationId,
    queryFn: async () => { const args: { _event_id?: string } = {}; if (eventId) args._event_id = eventId; const { data, error } = await supabase.rpc("get_hourly_sales_stats", args); if (error) throw error; return data as { hour: string; value: number }[]; },
  });
}

export type TemperatureLevel = "normal" | "aquecendo" | "quente" | "explodindo";
export type TemperatureThresholds = { aquecendo: number; quente: number; explodindo: number };
export const TEMPERATURE_THRESHOLDS: TemperatureThresholds = { aquecendo: 10, quente: 25, explodindo: 50 };

export function classifyTemperature(salesPerDay: number, thresholds: TemperatureThresholds = TEMPERATURE_THRESHOLDS): TemperatureLevel {
  if (salesPerDay >= thresholds.explodindo) return "explodindo";
  if (salesPerDay >= thresholds.quente) return "quente";
  if (salesPerDay >= thresholds.aquecendo) return "aquecendo";
  return "normal";
}

export function salesVelocity(sales: { created_at: string; status: string; is_courtesy?: boolean }[], hours = 24) {
  const since = Date.now() - hours * 3600_000;
  return sales.filter((s) => !s.is_courtesy && s.status === "pago" && new Date(s.created_at).getTime() >= since).length / (hours / 24);
}

export function useTemperature(eventId?: string) {
  const { user, organizationId, loading: authLoading } = useAuth();
  const { data: preferences, isLoading: preferencesLoading } = useOperationalPreferences();
  const salesPerDayQuery = useQuery({
    queryKey: ["sales", "temperature", organizationId, user?.id, eventId],
    queryFn: async () => {
      let query = supabase.from("sales").select("created_at, status, is_courtesy, quantity").eq("status", "pago").eq("is_courtesy", false);
      if (eventId) query = query.eq("event_id", eventId);
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data, error } = await query.gte("created_at", since);
      if (error) throw error;
      return (data || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
    },
    enabled: !authLoading && !!user && !!organizationId && !preferencesLoading,
  });
  const thresholds = preferences ? { aquecendo: preferences.temperature_aquecendo_sales_per_day, quente: preferences.temperature_quente_sales_per_day, explodindo: preferences.temperature_explodindo_sales_per_day } : TEMPERATURE_THRESHOLDS;
  const salesPerDay = salesPerDayQuery.data ?? 0;
  return { salesPerDay, level: classifyTemperature(salesPerDay, thresholds), thresholds, isLoading: authLoading || preferencesLoading || salesPerDayQuery.isLoading };
}

export function useAudienceStats(eventId?: string) {
  const { user, organizationId, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["customers", "audience-stats", organizationId, user?.id, eventId],
    enabled: !authLoading && !!user && !!organizationId,
    queryFn: async () => {
      let salesQuery = supabase.from("sales").select("customer_id").eq("status", "pago");
      if (eventId) salesQuery = salesQuery.eq("event_id", eventId);
      const { data: paidSales, error: salesError } = await salesQuery;
      if (salesError) throw salesError;
      const customerIds = Array.from(new Set((paidSales ?? []).map((s) => s.customer_id).filter(Boolean))) as string[];
      const customersQuery = eventId
        ? customerIds.length > 0 ? supabase.from("customers").select("id, data_nascimento, cidade, sexo, created_at").in("id", customerIds) : null
        : supabase.from("customers").select("id, data_nascimento, cidade, sexo, created_at");
      const { data: customers, error } = customersQuery ? await customersQuery : { data: [], error: null };
      if (error) throw error;
      const now = new Date(); const ages: number[] = []; const cityMap = new Map<string, number>(); let newCustomers = 0;
      let femaleCount = 0; let maleCount = 0;
      (customers ?? []).forEach((c) => { if (c.data_nascimento) { const b = new Date(c.data_nascimento); let age = now.getFullYear() - b.getFullYear(); if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--; if (age > 0 && age < 120) ages.push(age); } if (c.cidade) cityMap.set(c.cidade, (cityMap.get(c.cidade) ?? 0) + 1); if (c.sexo === "feminino") femaleCount++; else if (c.sexo === "masculino") maleCount++; if (now.getTime() - new Date(c.created_at).getTime() <= 30 * 24 * 3600_000) newCustomers++; });
      const genderTotal = femaleCount + maleCount;
      const genderSplit = genderTotal > 0 ? { femalePct: Math.round((femaleCount / genderTotal) * 100), malePct: Math.round((maleCount / genderTotal) * 100) } : null;
      const purchases = new Map<string, number>(); (paidSales ?? []).forEach((s) => { if (s.customer_id) purchases.set(s.customer_id, (purchases.get(s.customer_id) ?? 0) + 1); });
      const recurringCustomers = Array.from(purchases.values()).filter((n) => n > 1).length;
      const ageRange = ages.length ? { min: Math.min(...ages), max: Math.max(...ages) } : null;
      const topCities = Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([city, count]) => ({ city, count }));

      let viewsQuery = supabase.from("event_page_views" as any).select("id", { count: "exact", head: true });
      if (eventId) viewsQuery = viewsQuery.eq("event_id", eventId);
      else viewsQuery = viewsQuery.in("event_id", (await supabase.from("events").select("id").eq("organization_id", organizationId as string)).data?.map((e) => e.id) ?? []);
      const { count: totalViews } = await viewsQuery;

      return { totalCustomers: (customers ?? []).length, averageAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null, ageRange, genderSplit, newCustomers, recurringCustomers, topCities, totalViews: totalViews ?? 0 };
    },
  });
}

const PIX_FAILURE_STAGES = ["mp_rejected", "missing_qr_code", "exception"];

export function usePixFailures(eventId?: string) {
  const { user, organizationId, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["sales", "pix-failures", organizationId, user?.id, eventId],
    enabled: !authLoading && !!user && !!organizationId,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      let query = supabase
        .from("sales")
        .select("id, created_at, mp_debug_response")
        .not("mp_debug_response", "is", null)
        .gte("created_at", since);
      if (eventId) query = query.eq("event_id", eventId);
      const { data, error } = await query;
      if (error) throw error;
      const failures = (data ?? []).filter((sale) => {
        if (!sale.mp_debug_response) return false;
        try {
          const parsed = JSON.parse(sale.mp_debug_response) as { stage?: string };
          return !!parsed.stage && PIX_FAILURE_STAGES.includes(parsed.stage);
        } catch {
          return false;
        }
      });
      return { count: failures.length };
    },
    refetchInterval: 60_000,
  });
}
