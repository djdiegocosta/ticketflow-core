import { createFileRoute, redirect } from "@tanstack/react-router";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { requireSession } from "@/lib/auth-guard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cliente")({
  ssr: false,
  beforeLoad: async () => {
    const ctx = await requireSession();

    if (ctx.role === "operador_checkin") {
      throw redirect({ to: "/checkin" });
    }

    if (ctx.role === "cliente") {
      // ORGANIZAÇÃO ÚNICA: busca sempre a mesma org via RPC
      const { data } = await supabase.rpc("get_single_organization_id");
      const organizationId = data as string | null;

      if (organizationId) {
        await supabase.rpc("get_or_create_customer", {
          _organization_id: organizationId,
        });
      }
    }

    return { auth: ctx };
  },
  component: MobileLayout,
});
