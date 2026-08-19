import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginPage from "@/pages/LoginPage";
import { supabase } from "@/integrations/supabase/client";
import { homeRouteForRole, type GuardRole } from "@/lib/auth-guard";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle();

    throw redirect({ to: homeRouteForRole((roleRow?.role as GuardRole) ?? "cliente") });
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
