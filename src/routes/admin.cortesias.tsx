import { createFileRoute, redirect } from "@tanstack/react-router";
import { CourtesiesListPage } from "@/pages/admin/CourtesiesListPage";

export const Route = createFileRoute("/admin/cortesias")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
  head: () => ({
    meta: [
      { title: "Cortesias | TicketFlow" },
      { name: "description", content: "Cortesias — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Cortesias | TicketFlow" },
      { property: "og:description", content: "Cortesias — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_cortesias,
});

function Page_admin_cortesias() {
  return <CourtesiesListPage />;
}
