import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SALES_LINK_CHANNELS = [
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "anuncio", label: "Anúncio pago" },
  { value: "influenciador", label: "Influenciador" },
  { value: "equipe", label: "Equipe de divulgação" },
  { value: "outro", label: "Outro" },
] as const;

export const channelLabel = (value: string) =>
  SALES_LINK_CHANNELS.find((c) => c.value === value)?.label ?? "Outro";

export interface SalesLink {
  id: string;
  event_id: string;
  organization_id: string;
  name: string;
  channel: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface SalesLinkStat {
  sales_link_id: string;
  name: string;
  channel: string;
  code: string;
  is_active: boolean;
  sales_count: number;
  revenue: number;
}

/** Lista simples dos links de um evento (sem estatísticas). */
export function useSalesLinks(eventId?: string | null) {
  return useQuery<SalesLink[]>({
    queryKey: ["sales-links", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_links")
        .select("*")
        .eq("event_id", eventId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as SalesLink[];
    },
  });
}

/** Estatísticas por canal cadastrado + do link padrão (sem canal). */
export function useSalesLinkStats(eventId?: string | null) {
  return useQuery({
    queryKey: ["sales-links", "stats", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const [links, direct] = await Promise.all([
        supabase.rpc("get_sales_link_stats", { _event_id: eventId! }),
        supabase.rpc("get_direct_sales_stats", { _event_id: eventId! }),
      ]);
      if (links.error) throw links.error;
      if (direct.error) throw direct.error;

      const directRow = (Array.isArray(direct.data) ? direct.data[0] : direct.data) as
        | { sales_count: number; revenue: number }
        | undefined;

      return {
        links: ((links.data ?? []) as any[]).map((l) => ({
          ...l,
          sales_count: Number(l.sales_count ?? 0),
          revenue: Number(l.revenue ?? 0),
        })) as SalesLinkStat[],
        direct: {
          sales_count: Number(directRow?.sales_count ?? 0),
          revenue: Number(directRow?.revenue ?? 0),
        },
      };
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["sales-links"] });
}

export function useCreateSalesLink() {
  const invalidate = useInvalidate();
  return async (vars: {
    organization_id: string;
    event_id: string;
    name: string;
    channel: string;
    code: string;
  }) => {
    const { error } = await supabase.from("sales_links").insert({
      organization_id: vars.organization_id,
      event_id: vars.event_id,
      name: vars.name.trim(),
      channel: vars.channel,
      code: vars.code.trim().toLowerCase(),
    });
    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate")) {
        throw new Error("Já existe um link com este código neste evento.");
      }
      throw error;
    }
    await invalidate();
  };
}

export function useUpdateSalesLink() {
  const invalidate = useInvalidate();
  return async (id: string, values: { name?: string; channel?: string }) => {
    const { error } = await supabase.from("sales_links").update(values).eq("id", id);
    if (error) throw error;
    await invalidate();
  };
}

export function useDeactivateSalesLink() {
  const invalidate = useInvalidate();
  return async (id: string, isActive: boolean) => {
    const { error } = await supabase.from("sales_links").update({ is_active: isActive }).eq("id", id);
    if (error) throw error;
    await invalidate();
  };
}

export function useDeleteSalesLink() {
  const invalidate = useInvalidate();
  return async (id: string) => {
    const { error } = await supabase.from("sales_links").delete().eq("id", id);
    if (error) throw error;
    await invalidate();
  };
}

export function salesLinkUrl(slug: string, code: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/e/${slug}?ref=${code}`;
}

export function eventDefaultUrl(slug: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/e/${slug}`;
}
