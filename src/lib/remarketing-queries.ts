import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useRemarketingData(periodHours: number = 24) {
  return useQuery({
    queryKey: ["remarketing", periodHours],
    queryFn: async () => {
      // 1. Abandonos "Não gerou Pix" (tabela checkout_abandonments)
      const { data: abandonments, error: abError } = await supabase
        .from("checkout_abandonments")
        .select(`
          id,
          customer_name,
          customer_whatsapp,
          created_at,
          event_id,
          events (title),
          ticket_batch_id,
          ticket_batches (name)
        `)
        .gte("created_at", new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (abError) throw abError;

      // 2. Abandonos "Pix gerado, não pago" (sales pendentes expiradas)
      const { data: pendingSales, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          buyer_name,
          buyer_whatsapp,
          created_at,
          event_id,
          events (title),
          batch_id,
          ticket_batches (name),
          expires_at
        `)
        .in("status", ["pendente", "expirado"])
        .or(`expires_at.lt.${new Date().toISOString()},status.eq.expirado`)

        .gte("created_at", new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;

      // Combinar as duas fontes
      const list = [
        ...(abandonments || []).map((a: any) => ({
          id: a.id,
          name: a.customer_name,
          whatsapp: a.customer_whatsapp,
          event: a.events?.title || "Evento removido",
          lot: a.ticket_batches?.name || "Lote removido",
          type: "Não gerou Pix" as const,
          createdAt: a.created_at,
          status: "Não contactado" as any, // Calculado via cruzar com logs no futuro, por enquanto mock status
        })),
        ...(pendingSales || []).map((s: any) => ({
          id: s.id,
          name: s.buyer_name,
          whatsapp: s.buyer_whatsapp,
          event: s.events?.title || "Evento removido",
          lot: s.ticket_batches?.name || "Lote removido",
          type: "Pix não pago" as const,
          createdAt: s.created_at,
          status: "Não contactado" as any,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return list;
    },
  });
}
