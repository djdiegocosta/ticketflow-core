import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function fetchSales() {
  const { data, error } = await supabase
    .from("sales")
    .select(`
      id,
      buyer_name,
      buyer_whatsapp,
      buyer_email,
      total_amount,
      quantity,
      status,
      origin,
      payment_method,
      observation,
      created_at,
      events (title),
      ticket_batches (name)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: fetchSales,
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
        .from("tickets")
        .select(`
          checked_in_at,
          sales!inner (is_courtesy)
        `)
        .eq("sales.is_courtesy", true);

      if (error) throw error;

      const total = data?.length || 0;
      const checkins = data?.filter((t) => t.checked_in_at).length || 0;

      return { total, checkins };
    },
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ["sales", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          buyer_name,
          buyer_whatsapp,
          buyer_email,
          total_amount,
          quantity,
          status,
          origin,
          payment_method,
          observation,
          created_at,
          events (title),
          ticket_batches (name),
          tickets (ticket_code, participant_name, checked_in_at)
        `)
        .eq("id", id)
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
      let query = supabase.from("tickets").select(`
        checked_in_at,
        created_at,
        sales!inner (
          id,
          total_amount,
          status,
          is_courtesy,
          event_id
        )
      `);

      if (eventId && eventId !== "overview") {
        query = query.eq("sales.event_id", eventId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = {
        totalRevenue: 0,
        totalSales: 0,
        totalTickets: 0,
        pendingSales: 0,
        cancelledSales: 0,
        paidSales: 0,
        courtesies: 0,
        last14Days: [] as { date: string; value: number }[],
      };

      const saleIds = new Set<string>();
      const paidSaleIds = new Set<string>();

      const now = new Date();
      const dailyMap = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dailyMap.set(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), 0);
      }

      data.forEach((t) => {
        const s = t.sales as any;
        if (!saleIds.has(s.id)) {
          saleIds.add(s.id);
          stats.totalSales++;
          if (s.status === "pago") {
            stats.totalRevenue += Number(s.total_amount);
            paidSaleIds.add(s.id);
            stats.paidSales++;
          } else if (s.status === "pendente") {
            stats.pendingSales++;
          } else if (s.status === "cancelado") {
            stats.cancelledSales++;
          } else if (s.status === "reembolsado") {
            // Reembolsado também é neutro/finalizado
          }
        }

        if (s.is_courtesy) {
          stats.courtesies++;
        } else if (s.status === "pago") {
          stats.totalTickets++;
          
          const dateStr = new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          if (dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
          }
        }
      });

      stats.last14Days = Array.from(dailyMap.entries())
        .map(([date, value]) => ({ date, value }))
        .reverse();

      return stats;
    },
  });
}

export const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
