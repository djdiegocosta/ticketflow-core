import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOrganization() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const { data: roleRow, error: roleError } = await supabase
        .from("user_roles")
        .select("organization_id")
        .limit(1)
        .single();
      
      if (roleError) throw roleError;
      
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", roleRow.organization_id)
        .single();
        
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { name: string; email?: string; phone?: string; logo_url?: string }) => {
      const { error } = await supabase.rpc("update_organization_profile", {
        _name: vars.name,
        _email: vars.email || null,
        _phone: vars.phone || null,
        _logo_url: vars.logo_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Organização atualizada com sucesso");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useMpConfig() {
  return useQuery({
    queryKey: ["mp_config"],
    queryFn: async () => {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("organization_id")
        .limit(1)
        .single();
        
      const { data, error } = await supabase
        .from("mp_config")
        .select("*")
        .eq("organization_id", roleRow?.organization_id)
        .maybeSingle();
        
      if (error) throw error;
      return data || {
        status: "nao_configurado",
        sandbox_public_key: "",
        prod_public_key: "",
      };
    },
  });
}

export function useUpdateMpConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { 
      environment: "sandbox" | "producao",
      public_key: string,
      access_token: string,
      webhook_secret?: string
    }) => {
      const { error } = await supabase.rpc("upsert_mp_config", {
        _environment: vars.environment,
        _public_key: vars.public_key,
        _access_token: vars.access_token,
        _webhook_secret: vars.webhook_secret || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp_config"] });
      toast.success("Configuração do Mercado Pago salva");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
