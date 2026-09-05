import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  saveMpCredentials,
  validateMpCredentials,
  testMpWebhook,
  createMpPix,
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
      const { data, error } = await supabase
        .from("organizations")
        .update({ name: vars.name, contact_email: vars.email || null, contact_phone: vars.phone || null, logo_url: vars.logo_url || null })
        .eq("id", roleRow.organization_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!data) throw new Error("Não foi possível salvar: verifique suas permissões");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Organização atualizada com sucesso");
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateDesignSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { accent_color?: string; corner_style?: string }) => {
      const { data: roleRow } = await supabase.from("user_roles").select("organization_id").limit(1).single();
      if (!roleRow) throw new Error("Não autorizado");
      const updateData: any = {};
      if (vars.accent_color !== undefined) updateData.accent_color = vars.accent_color;
      if (vars.corner_style !== undefined) updateData.corner_style = vars.corner_style;
      const { data, error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", roleRow.organization_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!data) throw new Error("Não foi possível salvar: verifique suas permissões");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Design atualizado com sucesso");
    },
    onError: (error) => toast.error(error.message),
  });
}

export type OperationalPreferences = {
  pending_sale_expiration_minutes: number;
  temperature_aquecendo_sales_per_day: number;
  temperature_quente_sales_per_day: number;
  temperature_explodindo_sales_per_day: number;
};

const DEFAULT_OPERATIONAL_PREFERENCES: OperationalPreferences = {
  pending_sale_expiration_minutes: 30,
  temperature_aquecendo_sales_per_day: 10,
  temperature_quente_sales_per_day: 25,
  temperature_explodindo_sales_per_day: 50,
};

export function useOperationalPreferences() {
  return useQuery<OperationalPreferences>({
    queryKey: ["organization", "operational-preferences"],
    queryFn: async () => {
      const { data: orgId, error: orgError } = await supabase.rpc("get_single_organization_id");
      if (orgError || !orgId) throw orgError || new Error("Organização não encontrada");
      const { data, error } = await (supabase.from("organizations") as any)
        .select("pending_sale_expiration_minutes, temperature_aquecendo_sales_per_day, temperature_quente_sales_per_day, temperature_explodindo_sales_per_day")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return { ...DEFAULT_OPERATIONAL_PREFERENCES, ...(data || {}) };
    },
  });
}

export function useUpdateOperationalPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: Partial<OperationalPreferences>) => {
      const { data: orgId, error: orgError } = await supabase.rpc("get_single_organization_id");
      if (orgError || !orgId) throw orgError || new Error("Organização não encontrada");
      const { data, error } = await (supabase.from("organizations") as any)
        .update(vars)
        .eq("id", orgId)
        .select("pending_sale_expiration_minutes, temperature_aquecendo_sales_per_day, temperature_quente_sales_per_day, temperature_explodindo_sales_per_day")
        .single();
      if (error) throw error;
      return data as OperationalPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", "operational-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Preferências salvas");
    },
    onError: (error) => toast.error(error.message || "Erro ao salvar preferências"),
  });
}

export function useMpConfig() {
  return useQuery({
    queryKey: ["mp_config"],
    queryFn: async () => {
      const { data: roleRow } = await supabase.from("user_roles").select("organization_id").limit(1).single();
      const organization_id = roleRow?.organization_id || "";
      const { data, error } = await supabase.from("mp_config").select("*").eq("organization_id", organization_id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data || { status: "nao_configurado", sandbox_public_key: "", prod_public_key: "" };
    },
  });
}

export function useUpdateMpConfig() {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveMpCredentials);
  return useMutation({
    mutationFn: async (vars: { environment: "sandbox" | "producao"; public_key: string; access_token: string; webhook_secret?: string }) => {
      const { data: roleRow } = await supabase.from("user_roles").select("organization_id").limit(1).single();
      if (!roleRow) throw new Error("Não autorizado");
      return await saveFn({ data: { organization_id: roleRow.organization_id, environment: vars.environment, public_key: vars.public_key, access_token: vars.access_token, webhook_secret: vars.webhook_secret } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mp_config"] }); toast.success("Configuração do Mercado Pago salva com segurança"); },
    onError: (error) => toast.error(error.message || "Erro ao salvar credenciais"),
  });
}

export function useValidateMpConfig() {
  const validateFn = useServerFn(validateMpCredentials);
  return useMutation({
    mutationFn: async (vars: { organization_id: string; environment: "sandbox" | "producao" }) => await validateFn({ data: vars }),
    onSuccess: () => toast.success("Credenciais validadas com sucesso"),
    onError: () => toast.error("Credenciais inválidas ou expiradas"),
  });
}

export function useTestMpWebhook() {
  const testFn = useServerFn(testMpWebhook);
  return useMutation({
    mutationFn: async (vars: { organization_id: string; environment: "sandbox" | "producao" }) => await testFn({ data: vars }),
    onSuccess: (result) => {
      if (result?.status === "Configurado") toast.success("Chave secreta do webhook validada com sucesso");
      else toast.error("Nenhuma chave secreta de webhook salva para este ambiente");
    },
    onError: (error) => toast.error(error.message || "Falha ao validar segredo do webhook"),
  });
}


export function useCreateTestPix() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createMpPix);
  return useMutation({
    mutationFn: async (vars: { sale_id: string }) => await createFn({ data: vars }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mp_config"] }); toast.success("PIX de teste gerado com sucesso"); },
    onError: (error) => toast.error(error.message || "Erro ao gerar PIX"),
  });
}

export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data: roleRow } = await supabase.from("user_roles").select("organization_id").limit(1).single();
      if (!roleRow) throw new Error("Não autorizado");
      const { data, error } = await supabase.from("client_banners").select("*").eq("organization_id", roleRow.organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { title: string; text_content?: string; image_url?: string; link_url?: string; is_active?: boolean }) => {
      const { data: roleRow } = await supabase.from("user_roles").select("organization_id").limit(1).single();
      if (!roleRow) throw new Error("Não autorizado");
      const { data, error } = await supabase.from("client_banners").insert([{ ...vars, organization_id: roleRow.organization_id }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["banners"] }); toast.success("Banner criado com sucesso"); },
  });
}

export function useUpdateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; title?: string; text_content?: string; image_url?: string; link_url?: string; is_active?: boolean }) => {
      const { id, ...updateData } = vars;
      const { error } = await supabase.from("client_banners").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["banners"] }); toast.success("Banner atualizado com sucesso"); },
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["banners"] }); toast.success("Banner excluído com sucesso"); },
  });
}
