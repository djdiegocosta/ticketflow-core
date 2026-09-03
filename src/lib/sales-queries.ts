import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createMpPix } from "./mp/mercado-pago.functions";

export interface Sale {
  id: string;
  sale_code?: string | null;
  buyer_name: string;
  buyer_whatsapp: string;
  buyer_email: string | null;
  total_amount: number;
  quantity: number;
  status: "pago" | "pendente" | "cancelado" | "expirado" | "reembolsado";
  origin: "ticketflow" | "manual" | "importado";
  payment_method: string | null;
  observation: string | null;
  is_courtesy: boolean;
  created_at: string;
  event_id: string;
  events: { title: string };
  ticket_batches: { name: string };
  tickets?: { ticket_code: string; participant_name: string; checked_in_at: string | null }[];
}

export async function fetchSales(organizationId: string): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(`id, sale_code, buyer_name, buyer_whatsapp, buyer_email, total_amount, quantity, status, origin, payment_method, observation, is_courtesy, created_at, event_id, events (title), ticket_batches (name)`)
    .eq("organization_id", organizationId)
    .eq("is_courtesy", false)
    .neq("status", "expirado")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export function useSales() {
  return useQuery<Sale[]>({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data: orgData } = await supabase.rpc("get_single_organization_id");
      const orgId = Array.isArray(orgData) ? orgData[0] : orgData;
      if (!orgId) throw new Error("Organização não encontrada");
      return fetchSales(orgId as string);
    },
  });
}

export function useCourtesies() {
  return useQuery({
    queryKey: ["tickets", "courtesies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tickets").select(`id, ticket_code, participant_name, checked_in_at, status, created_at, sales!inner (id, is_courtesy, created_at, event_id, events (title))`).eq("sales.is_courtesy", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCourtesiesStats() {
  return useQuery({
    queryKey: ["courtesies", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_ticket_stats").select("cortesias_emitidas, checkins_cortesias");
      if (error) throw error;
      return { total: (data || []).reduce((acc, v) => acc + (v.cortesias_emitidas || 0), 0), checkins: (data || []).reduce((acc, v) => acc + (v.checkins_cortesias || 0), 0) };
    },
  });
}

export function useSale(id: string) {
  return useQuery<Sale>({
    queryKey: ["sales", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select(`id, sale_code, buyer_name, buyer_whatsapp, buyer_email, total_amount, quantity, status, origin, payment_method, observation, is_courtesy, created_at, event_id, events (title), ticket_batches (name), tickets (ticket_code, participant_name, checked_in_at)`).eq("id", id).eq("is_courtesy", false).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useSalesStats(eventId?: string) {
  return useQuery({
    queryKey: ["sales", "stats", eventId],
    queryFn: async () => {
      const { data: orgData } = await supabase.rpc("get_single_organization_id");
      const orgId = Array.isArray(orgData) ? orgData[0] : orgData;
      if (!orgId) throw new Error("Organização não encontrada");
      let statsQuery = supabase.from("event_ticket_stats").select("*").eq("organization_id", orgId);
      if (eventId && eventId !== "overview") statsQuery = statsQuery.eq("event_id", eventId);
      const { data: viewData, error: viewError } = await statsQuery;
      if (viewError) throw viewError;
      let ticketsQuery = supabase.from("tickets").select(`created_at, sales!inner (id, total_amount, status, is_courtesy, event_id, organization_id)`).eq("sales.organization_id", orgId);
      if (eventId && eventId !== "overview") ticketsQuery = ticketsQuery.eq("sales.event_id", eventId);
      const { data: ticketsData, error: ticketsError } = await ticketsQuery;
      if (ticketsError) throw ticketsError;
      const stats = { totalRevenue: 0, totalSales: 0, totalTickets: (viewData || []).reduce((acc, v) => acc + (v.ingressos_vendidos || 0), 0), pendingSales: 0, pendingAmount: 0, checkins: (viewData || []).reduce((acc, v) => acc + (v.checkins_vendidos || 0) + (v.checkins_cortesias || 0), 0), validTickets: (viewData || []).reduce((acc, v) => acc + (v.ingressos_vendidos || 0) + (v.cortesias_emitidas || 0), 0), cancelledSales: 0, paidSales: 0, courtesies: (viewData || []).reduce((acc, v) => acc + (v.cortesias_emitidas || 0), 0), last14Days: [] as { date: string; value: number }[] };
      const saleIds = new Set<string>(); const now = new Date(); const dailyMap = new Map<string, number>();
      for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(now.getDate() - i); dailyMap.set(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), 0); }
      (ticketsData || []).forEach((t) => { const s = t.sales as any; if (!saleIds.has(s.id)) { saleIds.add(s.id); stats.totalSales++; if (s.status === "pago" && !s.is_courtesy) { stats.totalRevenue += Number(s.total_amount); stats.paidSales++; } else if (s.status === "pendente") { stats.pendingSales++; stats.pendingAmount += Number(s.total_amount); } else if (s.status === "cancelado") stats.cancelledSales++; } if (s.status === "pago" && !s.is_courtesy) { const key = new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) || 0) + 1); } });
      stats.last14Days = Array.from(dailyMap.entries()).reverse().map(([date, value]) => ({ date, value }));
      return stats;
    },
  });
}

export async function createSalePix(saleId: string) {
  return createMpPix({ data: { sale_id: saleId } });
}
