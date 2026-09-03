import { createMiddleware } from "@tanstack/react-start";
import { getCookies } from "@tanstack/react-start/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const requireMpAdmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const cookies = getCookies();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
        setAll: () => {},
      },
    },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Não autenticado");

  const { data: role, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();
  if (roleError || !role?.organization_id) throw new Error("Acesso negado");

  return next({ context: { mpAdminUserId: user.id, mpAdminOrganizationId: role.organization_id } });
});
