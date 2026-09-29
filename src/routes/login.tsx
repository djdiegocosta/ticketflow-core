import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginPage from "@/pages/LoginPage";
import { supabase } from "@/integrations/supabase/client";
import { homeRouteForRole, type GuardRole } from "@/lib/auth-guard";
import { authSnapshots } from "@/lib/auth-snapshot";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Se já estiver logado, buscar o papel real para saber para onde ir.
    // Usa o snapshot compartilhado com o AuthProvider (mesma consulta, sem repetir).
    const snapshot = await authSnapshots.get(session.user.id);
    const role = snapshot.role as GuardRole;
    throw redirect({ to: homeRouteForRole(role) });
  },


  head: () => ({
    meta: [
      { title: "Login | TicketFlow" },
      { name: "description", content: "Tela de acesso do produtor e do cliente." },
      { property: "og:title", content: "Login | TicketFlow" },
      { property: "og:description", content: "Tela de acesso do produtor e do cliente." },
    ],
  }),
  component: LoginPage,
});
