import { createMiddleware } from "@tanstack/react-start";
import { getRequest, parseCookieHeader } from "@tanstack/react-start/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const requireMpAdmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = parseCookieHeader(cookieHeader).map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
  }));

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookies,
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

  return next({
    context: {
      mpAdminUserId: user.id,
      mpAdminOrganizationId: role.organization_id,
    },
  });
});
