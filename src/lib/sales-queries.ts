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
