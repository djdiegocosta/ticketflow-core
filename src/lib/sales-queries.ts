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
    .select(`
      id,
      sale_code,
      buyer_name,
      buyer_whatsapp,
      buyer_email,
      total_amount,
      quantity,
      status,
      origin,
      payment_method,
      observation,
      is_courtesy,
      created_at,
      event_id,
      events (title),
      ticket_batches (name)
    `)
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
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_code,
          participant_name,
          checked_in_at,
          status,
          created_at,
          sales!inner (
            id,
            is_courtesy,
            created_at,
            event_id,
            events (title)
          )
        `)
        .eq("sales.is_courtesy", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCourtesiesStats() {
  return useQuery({
    queryKey: ["courtesies", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_ticket_stats")
        .select("cortesias_emitidas, checkins_cortesias");

      if (error) throw error;

      const total = (data || []).reduce((acc, v) => acc + (v.cortesias_emitidas || 0), 0);
      const checkins = (data || []).reduce((acc, v) => acc + (v.checkins_cortesias || 0), 0);

      return { total, checkins };
    },
  });
}

export function useSale(id: string) {
  return useQuery<Sale>({
    queryKey: ["sales", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          sale_code,
          buyer_name,
          buyer_whatsapp,
          buyer_email,
          total_amount,
          quantity,
          status,
          origin,
          payment_method,
          observation,
          is_courtesy,
          created_at,
          event_id,
          events (title),
          ticket_batches (name),
          tickets (ticket_code, participant_name, checked_in_at)
        `)
        .eq("id", id)
        .eq("is_courtesy", false)
        .single();

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

      let ticketsQuery = supabase.from("tickets").select(`
        created_at,
        sales!inner (
          id,
          total_amount,
          status,
          is_courtesy,
          event_id,
          organization_id
        )
      `).eq("sales.organization_id", orgId);

      if (eventId && eventId !== "overview") ticketsQuery = ticketsQuery.eq("sales.event_id", eventId);

      const { data: ticketsData, error: ticketsError } = await ticketsQuery;
      if (ticketsError) throw ticketsError;

      const stats = {
        totalRevenue: 0,
        totalSales: 0,
        totalTickets: (viewData || []).reduce((acc, v) => acc + (v.ingressos_vendidos || 0), 0),
        pendingSales: 0,
        pendingAmount: 0,
        checkins: (viewData || []).reduce((acc, v) => acc + (v.checkins_vendidos || 0) + (v.checkins_cortesias || 0), 0),
        validTickets: (viewData || []).reduce((acc, v) => acc + (v.ingressos_vendidos || 0) + (v.cortesias_emitidas || 0), 0),
        cancelledSales: 0,
        paidSales: 0,
        courtesies: (viewData || []).reduce((acc, v) => acc + (v.cortesias_emitidas || 0), 0),
        last14Days: [] as { date: string; value: number }[],
      };

      const saleIds = new Set<string>();
      const now = new Date();
      const dailyMap = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dailyMap.set(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), 0);
      }

      (ticketsData || []).forEach((t) => {
        const s = t.sales as any;
        if (!saleIds.has(s.id)) {
          saleIds.add(s.id);
          stats.totalSales++;
          if (s.status === "pago" && !s.is_courtesy) {
            stats.totalRevenue += Number(s.total_amount);
            stats.paidSales++;
          } else if (s.status === "pendente") {
            stats.pendingSales++;
            stats.pendingAmount += Number(s.total_amount);
          } else if (s.status === "cancelado") {
            stats.cancelledSales++;
          }
        }

        if (!s.is_courtesy && s.status === "pago") {
          const dateStr = new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          if (dailyMap.has(dateStr)) dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
        }
      });

      stats.last14Days = Array.from(dailyMap.entries()).map(([date, value]) => ({ date, value })).reverse();
      return stats;
    },
  });
}

export const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function useConfirmSalePaid() {
  return async (saleId: string, mpPaymentId: string = "SIMULADO") => {
    const { error } = await supabase.rpc("confirm_sale_paid", { _sale_id: saleId, _mp_payment_id: mpPaymentId });
    if (error) throw error;
  };
}

export function useCreatePendingSale() {
  return async (vars: { event_id: string; batch_id: string; buyer_name: string; buyer_whatsapp: string; buyer_email?: string; quantity: number; participant_names: string[]; customer_id?: string; ref_code?: string }) => {
    const cleanWhatsapp = vars.buyer_whatsapp.replace(/\D/g, "");
    const { data, error } = await supabase.rpc("create_pending_sale", {
      _event_id: vars.event_id,
      _batch_id: vars.batch_id,
      _buyer_name: vars.buyer_name,
      _buyer_whatsapp: cleanWhatsapp,
      _buyer_email: vars.buyer_email || "",
      _quantity: vars.quantity,
      _participant_names: vars.participant_names,
      ...(vars.customer_id ? { _customer_id: vars.customer_id } : {}),
      ...(vars.ref_code ? { _ref_code: vars.ref_code } : {}),
    });
    if (error) {
      if (error.message.includes("Estoque insuficiente")) throw new Error("Desculpe, o estoque para este lote acabou de esgotar.");
      throw error;
    }
    return data;
  };
}

export function useTrackAbandonment() {
  return async (vars: { event_id: string; buyer_name: string; buyer_whatsapp: string }) => {
    const cleanWhatsapp = vars.buyer_whatsapp.replace(/\D/g, "");
    const { error } = await supabase.rpc("track_checkout_abandonment", { _event_id: vars.event_id, _buyer_name: vars.buyer_name, _buyer_whatsapp: cleanWhatsapp });
    if (error) console.error("Erro ao registrar abandono:", error);
  };
}

export function useGenerateSalePix() {
  const createFn = useServerFn(createMpPix);
  return async (vars: { sale_id: string }) => await createFn({ data: vars });
}

export function useSaleStatus(saleId: string | null) {
  return useQuery({
    queryKey: ["sales", "status", saleId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("status").eq("id", saleId!).single();
      if (error) throw error;
      return data.status;
    },
    enabled: !!saleId,
    refetchInterval: (query) => query.state.data === "pago" ? false : 4000,
  });
}
