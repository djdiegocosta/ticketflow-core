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
    queryKey: ["sales", "courtesies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          buyer_name,
          created_at,
          events (title),
          tickets (checked_in)
        `)
        .eq("is_courtesy", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
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
          tickets (code, participant_name, checked_in)
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
      let query = supabase.from("sales").select(`
        id,
        total_amount,
        quantity,
        status,
        created_at,
        is_courtesy
      `);

      if (eventId && eventId !== "overview") {
        query = query.eq("event_id", eventId);
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

      const now = new Date();
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(now.getDate() - 14);

      const dailyMap = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dailyMap.set(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), 0);
      }

      data.forEach((s) => {
        if (s.status === "pago") {
          stats.totalRevenue += Number(s.total_amount);
          stats.totalTickets += Number(s.quantity);
          stats.paidSales++;
          
          const dateStr = new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          if (dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
          }
        } else if (s.status === "pendente") {
          stats.pendingSales++;
        } else if (s.status === "cancelado") {
          stats.cancelledSales++;
        }
        
        if (s.is_courtesy) stats.courtesies++;
        stats.totalSales++;
      });

      stats.last14Days = Array.from(dailyMap.entries())
        .map(([date, value]) => ({ date, value }))
        .reverse();

      return stats;
    },
  });
}
