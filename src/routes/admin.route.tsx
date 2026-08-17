import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { requireSession } from "@/lib/auth-guard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const ctx = await requireSession();

    if (ctx.role === "operador_checkin") {
      throw redirect({ to: "/checkin" });
    }

    if (!ctx.organizationId) {
      throw redirect({ to: "/primeiro-acesso" });
    }

    if (ctx.organizationStatus === "pending" || ctx.organizationStatus === "suspended") {
      throw redirect({ to: "/organizacao-pendente" });
    }

    if (ctx.role !== "admin" && ctx.role !== "colaborador") {
      throw redirect({ to: "/cliente" });
    }

    return { auth: ctx };
  },
  component: AdminLayout,
});
