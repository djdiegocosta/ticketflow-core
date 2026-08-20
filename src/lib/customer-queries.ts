import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { offlineDB } from "./offline-db";
import { ACCENT_COLORS, CORNER_STYLES, AccentColor, CornerStyle } from "./design";

/**
 * Hook para buscar dados do cliente logado (customer)
 */
export function useCurrentCustomer() {
  return useQuery({
    queryKey: ["current-customer"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          points_ledger (*)
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook para buscar as vendas/ingressos do cliente logado
 */
export function useCustomerSales() {
  const { data: customer } = useCurrentCustomer();

  return useQuery({
    queryKey: ["customer-sales", customer?.id],
    queryFn: async () => {
      if (!customer) return [];

      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          sale_code,
          total_amount,
          quantity,
          status,
          created_at,
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
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Cache para offline
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
    enabled: !!customer?.id
  });
}

/**
 * Hook para buscar as estatísticas resumidas do cliente
 */
export function useCustomerStats() {
  const { data: customer } = useCurrentCustomer();
  const { data: sales = [] } = useCustomerSales();

  const paidSales = sales.filter(s => s.status === 'pago');
  const totalEvents = new Set(paidSales.map(s => (s.events as any)?.id)).size;
  const totalTickets = paidSales.reduce((acc, s) => acc + (s.tickets?.length || 0), 0);
  const points = customer?.points || 0;

  return {
    totalEvents,
    totalTickets,
    points
  };
}

/**
 * Hook para buscar um evento pelo slug (Página do Evento)
 */
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

/**
 * Hook para buscar uma venda pelo código (Confirmação/Detalhe)
 */
export function useSaleByCode(code: string) {
  return useQuery({
    queryKey: ["sale-code", code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sale_by_code", { _code: code });
      if (error) throw error;
      
      const { data: tickets, error: tError } = await supabase.rpc("get_tickets_by_sale_code", { _code: code });
      if (tError) throw tError;

      return { ...data, tickets };
    },
    enabled: !!code
  });
}

/**
 * Hook para buscar um ticket individual pelo código
 */
export function useTicketByCode(code: string) {
  return useQuery({
    queryKey: ["ticket-code", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          sales (
            sale_code,
            events (
              title,
              event_date,
              location
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

/**
 * Hook para atualizar o perfil do cliente
 */
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


    }) => {
      if (!customer?.id) throw new Error("Cliente não identificado");

      const { error } = await supabase.rpc("update_customer", {
        _customer_id: customer.id,
        _full_name: vars.full_name,
        _email: vars.email,
        _whatsapp: vars.whatsapp,
        _data_nascimento: vars.data_nascimento || "",
        _cidade: vars.cidade,
        _instagram: vars.instagram || ""
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-customer"] });
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar perfil: " + error.message);
    }
  });
}
