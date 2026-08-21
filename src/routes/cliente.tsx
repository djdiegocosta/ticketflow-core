import { createFileRoute, redirect } from "@tanstack/react-router";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { requireSession } from "@/lib/auth-guard";
import { getLastVisitedOrg } from "@/lib/org-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cliente")({
  ssr: false,
  beforeLoad: async () => {
    const ctx = await requireSession();

    if (ctx.role === "operador_checkin") {
      throw redirect({ to: "/checkin" });
    }

    if (ctx.role === "cliente") {
      let organizationId = getLastVisitedOrg();

      if (!organizationId) {
        const { data } = await supabase.rpc("get_single_organization_id");
        if (data) {
          organizationId = data as string;
        }
      }

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
