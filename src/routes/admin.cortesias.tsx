import { createFileRoute, redirect } from "@tanstack/react-router";
import { CourtesiesListPage } from "@/pages/admin/CourtesiesListPage";

export const Route = createFileRoute("/admin/cortesias")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (!auth) throw redirect({ to: '/login' });
    
    const data = JSON.parse(auth);
    if (data.userRole === 'colaborador') {
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
