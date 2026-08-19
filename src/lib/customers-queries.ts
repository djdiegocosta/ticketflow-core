import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
          birth_date,
          created_at,
          sales (
            id,
            total_amount,
            status,
            event_id,
            events (title),
            tickets (id)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((c: any) => {
        const paidSales = c.sales?.filter((s: any) => s.status === "pago") || [];
        const uniqueEvents = new Set(paidSales.map((s: any) => s.event_id)).size;
        const totalTickets = paidSales.reduce((sum: number, s: any) => sum + (s.tickets?.length || 0), 0);
        const totalSpent = paidSales.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
        
        const lastSale = paidSales.length > 0 
          ? paidSales.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : null;

        // Cálculo de idade aproximado
        let age = null;
        if (c.birth_date) {
          const birth = new Date(c.birth_date);
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
        _data_nascimento: vars.birth_date || "",
        _cidade: "",
        _instagram: ""
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
