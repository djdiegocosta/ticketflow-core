import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LinksPageEvent {
  title: string;
  slug: string;
  event_date: string;
}

/**
 * Próximo evento aberto para venda, usado pelo botão "Comprar ingresso" da
 * página pública /links (link da bio do Instagram). Só leitura, sem login:
 * mesmo critério da vitrine do cliente (publicado, não encerrado, ainda por vir).
 */
export function useNextPublicEvent() {
  return useQuery({
    queryKey: ["links-page", "next-event"],
    staleTime: 60_000,
    queryFn: async (): Promise<LinksPageEvent | null> => {
      const { data, error } = await supabase
        .from("events")
        .select("title, slug, event_date")
        .eq("status", "publicado")
        .eq("is_closed", false)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}
