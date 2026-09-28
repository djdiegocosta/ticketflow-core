import { supabase } from "@/integrations/supabase/client";
import { createAuthSnapshotStore } from "./auth-snapshot-core";

/**
 * Instância única do snapshot de autenticação (papel + organização),
 * compartilhada por AuthProvider, guards de rota e telas de entrada.
 * Regras e motivação: docs/OTIMIZACAO-CARREGAMENTO.md.
 */
export const authSnapshots = createAuthSnapshotStore({
  fetchRole: async (userId) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (error) console.error("[Auth] Falha ao buscar papel do usuário:", error);
    return { data: (data?.role as string | undefined) ?? null, error };
  },
  // ORGANIZAÇÃO ÚNICA: sempre a mesma org, via RPC (funciona para todos os papéis).
  fetchOrganization: async () => {
    const { data, error } = await supabase.rpc("get_single_organization_id");
    if (error) console.error("[Auth] Falha ao buscar organização:", error);
    return { data: (data as string | null) ?? null, error };
  },
});

/**
 * Status da organização. NÃO faz parte do caminho crítico do boot: nenhuma
 * tela decide o primeiro render com ele hoje. Carregado depois que a
 * interface já apareceu.
 */
export async function fetchOrganizationStatus(organizationId: string): Promise<string | null> {
  const { data } = await supabase
    .from("organizations")
    .select("status")
    .eq("id", organizationId)
    .maybeSingle();
  return (data as { status?: string | null } | null)?.status ?? null;
}
