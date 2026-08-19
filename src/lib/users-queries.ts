import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOrganizationUsers() {
  return useQuery({
    queryKey: ["org_users"],
    queryFn: async () => {
      // 1. Obter membros atuais
      const { data: members, error: memError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          created_at,
          profiles (
            full_name,
            email
          )
        `);

      if (memError) throw memError;

      // 2. Obter convites pendentes
      const { data: invites, error: invError } = await supabase
        .from("pending_invites")
        .select("*");

      if (invError) throw invError;

      const userList = [
        ...(members || []).map((m: any) => ({
          id: m.user_id,
          name: m.profiles?.full_name || "Sem nome",
          email: m.profiles?.email || "Sem e-mail",
          role: m.role as "admin" | "colaborador" | "operador_checkin",
          invitedAt: m.created_at,
          status: "Ativo" as const,
        })),
        ...(invites || []).map((i: any) => ({
          id: i.id,
          name: "Convidado",
          email: i.email,
          role: i.role as "admin" | "colaborador" | "operador_checkin",
          invitedAt: i.created_at,
          status: "Convite pendente" as const,
        })),
      ];

      return userList;
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { email: string; role: string }) => {
      const { error } = await supabase.rpc("invite_user", {
        _email: vars.email,
        _role: vars.role.toLowerCase(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_users"] });
      toast.success("Convite enviado com sucesso");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { user_id: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", vars.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_users"] });
      toast.success("Usuário removido da organização");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
