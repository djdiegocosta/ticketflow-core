import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  // "pago" só aparece para quem foi contactado e depois pagou a própria reserva.
  status: "pendente" | "expirado" | "pago";
  created_at: string;
  expires_at: string | null;
  customer_id: string | null;
  event_id: string;
  remarketing_contacted_at: string | null;
  paid_at: string | null;
  // Contactado pelo operador e depois comprou (a própria reserva ou uma compra nova).
  recovered: boolean;
  events: { title: string; event_date: string; slug: string } | null;
}

export function useAbandonedCheckouts(eventId?: string | null) {
  return useQuery({
    queryKey: ["remarketing", "abandoned-checkouts", eventId],
    queryFn: async () => {
      if (eventId === null) return [];
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
          remarketing_contacted_at,
          paid_at,
          events ( title, event_date, slug )
        `,
        )
        .or("status.in.(pendente,expirado),and(status.eq.pago,remarketing_contacted_at.not.is.null)")
        .eq("is_courtesy", false)
        .order("created_at", { ascending: false });

      if (eventId) query = query.eq("event_id", eventId);

      const { data, error } = await query;
      if (error) throw error;
      const leads = ((data ?? []) as unknown as Omit<AbandonedCheckout, "recovered">[]).map((l) => ({
        ...l,
        recovered: false,
      })) as AbandonedCheckout[];
      if (leads.length === 0) return leads;

      // Cruza com as vendas PAGAS do mesmo evento por WhatsApp (só dígitos, já que
      // nem todo mundo tem cadastro) e por customer_id (quando existe):
      // - quem pagou sozinho, sem ter sido contactado antes, sai da lista;
      // - quem foi contactado e pagou DEPOIS do contato é "recuperado" e continua
      //   na lista, com esse rótulo, para entrar na conta do remarketing.
      const digits = (v: string | null) => (v ?? "").replace(/\D/g, "");
      const eventIds = Array.from(new Set(leads.map((l) => l.event_id)));
      const { data: paidSales, error: paidError } = await supabase
        .from("sales")
        .select("event_id, buyer_whatsapp, customer_id, paid_at, created_at, is_courtesy")
        .eq("status", "pago")
        .in("event_id", eventIds);
      if (paidError) throw paidError;

      type PaidSale = NonNullable<typeof paidSales>[number];
      const paidIndex = new Map<string, PaidSale[]>();
      const addPaid = (key: string, sale: PaidSale) => {
        const list = paidIndex.get(key);
        if (list) list.push(sale);
        else paidIndex.set(key, [sale]);
      };
      (paidSales ?? []).forEach((sale) => {
        const w = digits(sale.buyer_whatsapp);
        if (w) addPaid(`${sale.event_id}|w:${w}`, sale);
        if (sale.customer_id) addPaid(`${sale.event_id}|c:${sale.customer_id}`, sale);
      });
      const paidTime = (sale: PaidSale) => new Date(sale.paid_at ?? sale.created_at).getTime();

      const result: AbandonedCheckout[] = [];
      for (const lead of leads) {
        // Reserva já paga e contactada antes: o próprio pagamento é a recuperação.
        if (lead.status === "pago") {
          result.push({ ...lead, recovered: true });
          continue;
        }
        const w = digits(lead.buyer_whatsapp);
        const matches = [
          ...(w ? paidIndex.get(`${lead.event_id}|w:${w}`) ?? [] : []),
          ...(lead.customer_id ? paidIndex.get(`${lead.event_id}|c:${lead.customer_id}`) ?? [] : []),
        ];
        if (matches.length === 0) {
          result.push(lead);
          continue;
        }
        const contactedAt = lead.remarketing_contacted_at
          ? new Date(lead.remarketing_contacted_at).getTime()
          : null;
        const recovered =
          contactedAt !== null && matches.some((m) => !m.is_courtesy && paidTime(m) >= contactedAt);
        if (recovered) result.push({ ...lead, recovered: true });
        // Pagou sem ter sido contactado (ou antes do contato): não é lead de remarketing.
      }
      return result;
    },
  });
}

/**
 * Marca o lead como contactado, gravando o timestamp atual em remarketing_contacted_at.
 * Chamado quando o admin clica no botão de WhatsApp.
 */
export function useMarkRemarketingContacted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      // A tabela de vendas não aceita alteração direta (por segurança): o registro
      // do contato passa por uma função do banco, restrita a admin e colaborador.
      const { error } = await supabase.rpc("mark_remarketing_contacted", { _sale_id: saleId });
      if (error) throw error;
    },
    onError: () => {
      toast.error("Não foi possível registrar o contato. Tente novamente.");
    },
    onSuccess: () => {
      // Invalida o cache do painel para refletir o novo status imediatamente
      queryClient.invalidateQueries({ queryKey: ["remarketing"] });
    },
  });
}
