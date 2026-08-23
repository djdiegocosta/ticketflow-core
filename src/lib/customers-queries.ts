import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { ACCENT_COLORS, CORNER_STYLES, AccentColor, CornerStyle } from "./design";

export interface Customer {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string | null;
  age: number | null;
  total_events: number;
  total_tickets: number;
  total_spent: number;
  last_event_name: string | null;
  last_purchase_at: string | null;
  created_at: string;
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          id,
          full_name,
          whatsapp,
          email,
          data_nascimento,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar estatísticas em paralelo para evitar N+1
      const { data: salesStats, error: statsError } = await supabase
        .from("sales")
        .select("customer_id, total_amount, status, event_id, created_at, events(title), tickets(id)")
        .eq("status", "pago");

      if (statsError) throw statsError;

      return (data || []).map((c: any) => {
        const paidSales = (salesStats || []).filter((s: any) => s.customer_id === c.id);
        const uniqueEvents = new Set(paidSales.map((s: any) => s.event_id)).size;
        const totalTickets = paidSales.reduce((sum: number, s: any) => sum + (s.tickets?.length || 0), 0);
        const totalSpent = paidSales.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
        
        const lastSale = paidSales.length > 0 
          ? [...paidSales].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : null;

        let age = null;
        if (c.data_nascimento) {
          const birth = new Date(c.data_nascimento);
          const now = new Date();
          age = now.getFullYear() - birth.getFullYear();
          if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
            age--;
          }
        }

        return {
          id: c.id,
          full_name: c.full_name,
          whatsapp: c.whatsapp,
          email: c.email,
          age,
          total_events: uniqueEvents,
          total_tickets: totalTickets,
          total_spent: totalSpent,
          last_event_name: lastSale?.events?.title || null,
          last_purchase_at: lastSale?.created_at || null,
          created_at: c.created_at,
        };
      });
    },
  });
}

export function useCustomerDetail(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          sales (
            id,
            total_amount,
            quantity,
            status,
            created_at,
            events (title),
            ticket_batches (name)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; full_name: string; email?: string; whatsapp: string; birth_date?: string }) => {
      const { error } = await supabase.rpc("update_customer", {
        _customer_id: vars.id as any || null,
        _full_name: vars.full_name,
        _email: vars.email || "",
        _whatsapp: vars.whatsapp,
        _data_nascimento: (vars.birth_date || null) as any
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", vars.id] });
      toast.success("Cliente atualizado com sucesso");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_customer", {
        _customer_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente excluído com sucesso");
    },
    onError: (error: any) => {
      if (error.message?.includes("possui histórico de compras")) {
        toast.error("Este cliente não pode ser excluído porque possui histórico de compras.");
      } else {
        toast.error(error.message || "Erro ao excluir cliente");
      }
    },
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

  useEffect(() => {
    if (!design) return;

    const root = document.documentElement;
    const accent = design.accent_color as AccentColor;
    const radius = design.corner_style as CornerStyle;

    // Apply Colors
    if (ACCENT_COLORS[accent]) {
      const colorSet = ACCENT_COLORS[accent].light; // Default to light for public pages
      root.style.setProperty("--accent", colorSet.accent);
      root.style.setProperty("--accent-hover", colorSet.hover);
      root.style.setProperty("--accent-muted", colorSet.muted);
      root.style.setProperty("--accent-text", colorSet.text);
      root.style.setProperty("--primary", colorSet.accent);
      root.style.setProperty("--ring", colorSet.accent);
    }

    // Apply Radius
    if (CORNER_STYLES[radius]) {
      const style = CORNER_STYLES[radius];
      root.style.setProperty("--radius-sm", style.sm);
      root.style.setProperty("--radius-md", style.md);
      root.style.setProperty("--radius-lg", style.lg);
      root.style.setProperty("--radius-xl", style.xl);
      root.style.setProperty("--radius", style.md);
    }
  }, [design]);
}
