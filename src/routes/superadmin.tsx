import { createFileRoute, redirect } from "@tanstack/react-router";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/superadmin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw redirect({ to: "/login" });
    }

    // Verifica papel via user_roles (tabela oficial)
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleRow?.role !== 'admin') {
      // Se for operador de check-in, vai para a tela de check-in
      if (roleRow?.role === 'operador_checkin') {
        throw redirect({ to: "/checkin" });
      }
      // Outros papéis vão para o dashboard admin padrão
      throw redirect({ to: "/admin" });
    }
  },
  component: SuperAdminLayout,
});

