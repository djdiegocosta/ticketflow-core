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
            // Reembolsado não soma na receita ativa
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

export function useConfirmSalePaid() {
  return async (saleId: string, mpPaymentId: string = "SIMULADO") => {
    const { error } = await supabase.rpc("confirm_sale_paid", {
      _sale_id: saleId,
      _mp_payment_id: mpPaymentId,
    });
    if (error) throw error;
  };
}

export function useCreatePendingSale() {
  return async (vars: {
    event_id: string;
    batch_id: string;
    buyer_name: string;
    buyer_whatsapp: string;
    buyer_email?: string;
    quantity: number;
    participant_names: string[];
  }) => {
    const { data, error } = await supabase.rpc("create_pending_sale", {
      _event_id: vars.event_id,
      _batch_id: vars.batch_id,
      _buyer_name: vars.buyer_name,
      _buyer_whatsapp: vars.buyer_whatsapp,
      _buyer_email: vars.buyer_email || "",
      _quantity: vars.quantity,
      _participant_names: vars.participant_names,
    });

    if (error) {
      if (error.message.includes("Estoque insuficiente")) {
        throw new Error("Desculpe, o estoque para este lote acabou de esgotar.");
      }
      throw error;
    }
    return data; // Retorna o ID da venda
  };
}

export function useTrackAbandonment() {
  return async (vars: {
    event_id: string;
    buyer_name: string;
    buyer_whatsapp: string;
  }) => {
    const { error } = await supabase.rpc("track_checkout_abandonment", {
      _event_id: vars.event_id,
      _buyer_name: vars.buyer_name,
      _buyer_whatsapp: vars.buyer_whatsapp,
    });
    if (error) console.error("Erro ao registrar abandono:", error);
  };
}
