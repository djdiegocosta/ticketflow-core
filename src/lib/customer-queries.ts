import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { offlineDB } from "./offline-db";
import { ACCENT_COLORS, AccentColor, FULL_THEME_OVERRIDES } from "./design";
import { useAuth } from "./auth-context";
import { useTheme } from "./theme";
import type { PillTone } from "@/components/admin/DataTable";

export function ticketStatusMeta(status: string): { label: string; tone: PillTone } {
  switch (status) {
    case "valido": return { label: "Válido", tone: "success" };
    case "utilizado": return { label: "Utilizado", tone: "warning" };
    case "cancelado": return { label: "Cancelado", tone: "error" };
    default: return { label: status, tone: "neutral" };
  }
}

export interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string;
  cidade: string | null;
  points: number;
  user_id: string;
  organization_id: string;
  updated_at: string;
  instagram: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  points_ledger?: any[];
}

export function useMyCustomerRecords() {
  return useQuery({
    queryKey: ["my-customer-records"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          points_ledger (*)
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCurrentCustomer() {
  const { data: customers } = useMyCustomerRecords();
  return {
    data: customers?.[0] || null,
    isLoading: !customers,
  };
}

export function useCustomerSales() {
  const { data: customers } = useMyCustomerRecords();

  return useQuery({
    queryKey: ["customer-sales", customers?.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!customers || customers.length === 0) return [];

      const customerIds = customers.map(c => c.id);

      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          sale_code,
          total_amount,
          quantity,
          status,
          created_at,
          expires_at,
          events (
            id,
            title,
            event_date,
            location,
            slug
          ),
          tickets (
            id,
            ticket_code,
            participant_name,
            status,
            checked_in_at
          )
        `)
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (typeof window !== "undefined" && data) {
        await offlineDB.saveMyTickets(data.flatMap(s => s.tickets.map(t => ({
          ...t,
          event_name: (s.events as any)?.title,
          event_date: (s.events as any)?.event_date,
          event_location: (s.events as any)?.location,
        }))));
      }

      return data;
    },
    enabled: !!customers && customers.length > 0,
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      return data?.some((s) => s.status === "pendente") ? 15000 : false;
    },
  });
}

export function useCustomerStats() {
  const { data: customer } = useCurrentCustomer();
  const { data: sales = [] } = useCustomerSales();

  const paidSales = (sales as any[]).filter(s => s.status === 'pago');
  const totalEvents = new Set(paidSales.map(s => (s.events as any)?.id)).size;
  const totalTickets = paidSales.reduce((acc, s) => acc + (s.tickets?.length || 0), 0);
  const points = customer?.points || 0;

  return { totalEvents, totalTickets, points };
}

export function usePublicEvent(slug: string) {
  return useQuery({
    queryKey: ["public-event", slug],
    queryFn: async () => {
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          *,
          ticket_batches (*)
        `)
        .eq("slug", slug)
        .eq("status", "publicado")
        .maybeSingle();

      if (error) throw error;
      return event;
    },
    enabled: !!slug
  });
}

export function useAvailableBatches(eventId: string | undefined) {
  return useQuery({
    queryKey: ["available-batches", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_available_batches", {
        _event_id: eventId as any
      });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!eventId
  });
}

export function useSaleByCode(code: string) {
  return useQuery({
    queryKey: ["sale-code", code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sale_by_code", { _code: code });
      if (error) throw error;
      const sale = Array.isArray(data) ? data[0] : data;
      if (!sale) return null;

      const { data: tickets, error: tError } = await supabase.rpc("get_tickets_by_sale_code", { _code: code });
      if (tError) throw tError;

      return { ...sale, tickets: tickets ?? [] };
    },
    enabled: !!code
  });
}

export function useTicketByCode(code: string) {
  return useQuery({
    queryKey: ["ticket-code", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          ticket_batches ( name ),
          sales (
            sale_code,
            created_at,
            events (
              title,
              event_date,
              location,
              organizations ( name )
            )
          )
        `)
        .eq("ticket_code", code)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!code
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { data: customer } = useCurrentCustomer();

  return useMutation({
    mutationFn: async (vars: {
      full_name: string;
      email: string;
      whatsapp: string;
      cidade: string;
      data_nascimento?: string | null | undefined;
      instagram?: string | null | undefined;
      sexo?: string | null | undefined;
    }) => {
      if (!customer?.id) throw new Error("Cliente não identificado");

      const { error } = await supabase.rpc("update_customer", {
        _customer_id: customer.id,
        _full_name: vars.full_name,
        _email: vars.email,
        _whatsapp: vars.whatsapp,
        _data_nascimento: (vars.data_nascimento || null) as any,
        _cidade: vars.cidade,
        _instagram: (vars.instagram || null) as any,
        _sexo: vars.sexo as any || null
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      // A query real usada por useCurrentCustomer é "my-customer-records".
      // A chave "current-customer" não existe, então a invalidação anterior
      // não buscava os dados novamente após o salvamento.
      await queryClient.invalidateQueries({ queryKey: ["my-customer-records"] });
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar perfil: " + error.message);
    }
  });
}

export function usePublicOrgDesign(slug: string | undefined) {
  return useQuery({
    queryKey: ["public_org_design", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_organization_design", {
        _slug: slug || "",
      });

      if (error) throw error;
      return (data as any)?.[0] as { accent_color: string; corner_style: string };
    },
    enabled: !!slug,
  });
}

export function useApplyPublicDesign(slug: string | undefined) {
  const { data: design } = usePublicOrgDesign(slug);
  const { theme } = useTheme();

  useEffect(() => {
    if (!design) return;

    const root = document.documentElement;
    const accent = design.accent_color as AccentColor;
    const isDark = theme === "dark";

    if (ACCENT_COLORS[accent]) {
      const colorSet = ACCENT_COLORS[accent][isDark ? "dark" : "light"];
      root.style.setProperty("--accent", colorSet.accent);
      root.style.setProperty("--accent-hover", colorSet.hover);
      root.style.setProperty("--accent-muted", colorSet.muted);
      root.style.setProperty("--accent-text", colorSet.text);
      root.style.setProperty("--icon-brand", colorSet.icon);
      root.style.setProperty("--primary", colorSet.accent);
      root.style.setProperty("--ring", colorSet.accent);
    }

    const override = FULL_THEME_OVERRIDES[accent];
    if (override) {
      const vars = isDark ? override.dark : override.light;
      Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    }
  }, [design, theme]);
}

export function useCustomerOrgDesign() {
  return useQuery({
    queryKey: ["customer_org_design"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_customer_organization_design");

      if (error) throw error;
      return (data as any)?.[0] as { accent_color: string; corner_style: string };
    },
    enabled: true,
  });
}

export function useApplyCustomerDesign() {
  const { data: design } = useCustomerOrgDesign();
  const { theme } = useTheme();

  useEffect(() => {
    if (!design) return;

    const root = document.documentElement;
    const accent = design.accent_color as AccentColor;
    const isDark = theme === "dark";

    if (ACCENT_COLORS[accent]) {
      const colorSet = ACCENT_COLORS[accent][isDark ? "dark" : "light"];
      root.style.setProperty("--accent", colorSet.accent);
      root.style.setProperty("--accent-hover", colorSet.hover);
      root.style.setProperty("--accent-muted", colorSet.muted);
      root.style.setProperty("--accent-text", colorSet.text);
      root.style.setProperty("--icon-brand", colorSet.icon);
      root.style.setProperty("--primary", colorSet.accent);
      root.style.setProperty("--ring", colorSet.accent);
    }

    const override = FULL_THEME_OVERRIDES[accent];
    if (override) {
      const vars = isDark ? override.dark : override.light;
      Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    }
  }, [design, theme]);
}

export function useActiveBanner() {
  return useQuery({
    queryKey: ["active-banner"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: customerData } = await supabase
        .from("customers")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const orgId = customerData?.organization_id;
      if (!orgId) return null;

      const { data, error } = await supabase
        .from("client_banners")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: true
  });
}

export function useOrgActiveEvents() {
  return useQuery({
    queryKey: ["org-active-events"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: customerData } = await supabase
        .from("customers")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const orgId = customerData?.organization_id;
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("events")
        .select("id, title, slug, event_date, location, image_url, ticket_batches(price, is_courtesy)")
        .eq("organization_id", orgId)
        .eq("status", "publicado")
        .eq("is_closed", false)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}
