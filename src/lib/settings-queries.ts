import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { 
  saveMpCredentials, 
  validateMpCredentials, 
  testMpWebhook, 
  createMpPix 
} from "./mp/mercado-pago.functions";

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
      const { data: roleRow } = await supabase.from("user_roles").select("organization_id").limit(1).single();
      if (!roleRow) throw new Error("Não autorizado");

      const { error } = await supabase.rpc("update_organization_profile", {
        _name: vars.name,
        _contact_email: vars.email || "",
        _contact_phone: vars.phone || "",
        _logo_url: vars.logo_url || "",
        _org_id: roleRow.organization_id
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
      const { data: roleRow } = await supabase.from("user_roles").select("organization_id").limit(1).single();
      const organization_id = roleRow?.organization_id || "";
        
      const { data, error } = await supabase
        .from("mp_config")
        .select("*")
        .eq("organization_id", organization_id)
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
  const saveFn = useServerFn(saveMpCredentials);
  
  return useMutation({
    mutationFn: async (vars: { 
      environment: "sandbox" | "producao",
      public_key: string,
      access_token: string,
      webhook_secret?: string
    }) => {
      const { data: roleRow } = await supabase.from("user_roles").select("organization_id").limit(1).single();
      if (!roleRow) throw new Error("Não autorizado");

      return await saveFn({
        data: {
          organization_id: roleRow.organization_id,
          environment: vars.environment,
          public_key: vars.public_key,
          access_token: vars.access_token,
          webhook_secret: vars.webhook_secret
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp_config"] });
      toast.success("Configuração do Mercado Pago salva com segurança");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar credenciais");
    },
  });
}

export function useValidateMpConfig() {
  const validateFn = useServerFn(validateMpCredentials);
  return useMutation({
    mutationFn: async (vars: { organization_id: string, environment: "sandbox" | "producao" }) => {
      return await validateFn({ data: vars });
    },
    onSuccess: () => {
      toast.success("Credenciais validadas com sucesso");
    },
    onError: (error) => {
      toast.error("Credenciais inválidas ou expiradas");
    }
  });
}

export function useTestMpWebhook() {
  const testFn = useServerFn(testMpWebhook);
  return useMutation({
    mutationFn: async (vars: { organization_id: string, environment: "sandbox" | "producao" }) => {
      return await testFn({ data: vars });
    },
    onError: (error) => {
      toast.error("Falha ao validar segredo do webhook");
    }
  });
}

export function useCreateTestPix() {
  const createFn = useServerFn(createMpPix);
  return useMutation({
    mutationFn: async (vars: { sale_id: string }) => {
      return await createFn({ data: vars });
    },
    onSuccess: () => {
      toast.success("PIX de teste gerado com sucesso");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar PIX");
    }
  });
}
