import { createFileRoute, redirect } from "@tanstack/react-router";
import InsightsPage from "@/pages/admin/InsightsPage";

// Exclusivo para administradores: qualquer outro papel volta para Vendas (colaborador) ou para o painel.
export const Route = createFileRoute("/admin/insights")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role !== "admin") {
      throw redirect({ to: "/admin/vendas" });
    }
  },
  head: () => ({
    meta: [{ title: "Insights — TicketFlow" }],
  }),
  component: InsightsPage,
});
