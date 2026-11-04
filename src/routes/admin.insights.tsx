import { createFileRoute } from "@tanstack/react-router";
import InsightsPage from "@/pages/admin/InsightsPage";

// A autorização é feita no componente, via useAuth(), pois o contexto do
// TanStack Router contém apenas queryClient e não expõe context.auth.
// O InsightsPage bloqueia os demais papéis, e as RPCs do banco também exigem admin.
export const Route = createFileRoute("/admin/insights")({
  head: () => ({
    meta: [{ title: "Insights — TicketFlow" }],
  }),
  component: InsightsPage,
});
