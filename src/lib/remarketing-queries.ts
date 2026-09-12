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
  events: { title: string; event_date: string; slug: string } | null;
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
          events ( title, event_date, slug )
        `,
        )
        .in("status", ["pendente", "expirado"])
        .eq("is_courtesy", false)
        .order("created_at", { ascending: false });

      if (eventId) query = query.eq("event_id", eventId);

      const { data, error } = await query;
      if (error) throw error;
      const leads = (data ?? []) as unknown as AbandonedCheckout[];
      if (leads.length === 0) return leads;

      // Não faz sentido oferecer remarketing pra quem já resolveu sozinho —
      // busca vendas PAGAS do mesmo evento e cruza por WhatsApp (guia
      // principal, já que nem todo mundo tem cadastro) e por customer_id
      // (quando existe). Quem já converteu sai da lista.
      const eventIds = Array.from(new Set(leads.map((l) => l.event_id)));
      const { data: paidSales, error: paidError } = await supabase
        .from("sales")
        .select("event_id, buyer_whatsapp, customer_id")
        .eq("status", "pago")
        .in("event_id", eventIds);
      if (paidError) throw paidError;

      const paidByWhatsapp = new Set(
        (paidSales ?? []).map((s) => `${s.event_id}|${s.buyer_whatsapp}`),
      );
      const paidByCustomer = new Set(
        (paidSales ?? []).filter((s) => s.customer_id).map((s) => `${s.event_id}|${s.customer_id}`),
      );

      return leads.filter((lead) => {
        const alreadyPaidByWhatsapp = paidByWhatsapp.has(`${lead.event_id}|${lead.buyer_whatsapp}`);
        const alreadyPaidByCustomer =
          !!lead.customer_id && paidByCustomer.has(`${lead.event_id}|${lead.customer_id}`);
        return !alreadyPaidByWhatsapp && !alreadyPaidByCustomer;
      });
    },
  });
}
