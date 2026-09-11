import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Painel de "Remarketing" — mostra quem gerou Pix e não pagou (clientes
 * cadastrados ou visitantes que só preencheram o checkout), pra permitir
 * contato manual. Isto é somente leitura: não envia mensagem nenhuma
 * sozinho, não altera nada em sales, checkout, Pix ou webhook.
 */
export interface AbandonedCheckout {
  id: string;
  buyer_name: string;
  buyer_whatsapp: string;
  buyer_email: string | null;
  quantity: number;
  total_amount: number;
  status: "pendente" | "expirado";
  created_at: string;
  expires_at: string | null;
  customer_id: string | null;
  event_id: string;
  events: { title: string; event_date: string } | null;
}

export function useAbandonedCheckouts(eventId?: string) {
  return useQuery({
    queryKey: ["remarketing", "abandoned-checkouts", eventId],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select(
          `
          id,
          buyer_name,
          buyer_whatsapp,
          buyer_email,
          quantity,
          total_amount,
          status,
          created_at,
          expires_at,
          customer_id,
          event_id,
          events ( title, event_date )
        `,
        )
        .in("status", ["pendente", "expirado"])
        .eq("is_courtesy", false)
        .order("created_at", { ascending: false });

      if (eventId) query = query.eq("event_id", eventId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AbandonedCheckout[];
    },
  });
}
