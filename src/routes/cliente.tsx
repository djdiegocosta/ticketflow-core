import { createFileRoute, redirect } from "@tanstack/react-router";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { requireSession } from "@/lib/auth-guard";

export const Route = createFileRoute("/cliente")({
  ssr: false,
  beforeLoad: async () => {
    const ctx = await requireSession();

    if (ctx.role === "operador_checkin") {
      throw redirect({ to: "/checkin" });
    }

    return { auth: ctx };
  },
  component: MobileLayout,
});
