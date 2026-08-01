import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminDashboard } from "@/pages/AdminDashboard";

export const Route = createFileRoute("/admin/")({
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
      { title: "Dashboard | TicketFlow" },
      { name: "description", content: "Dashboard do produtor — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Dashboard | TicketFlow" },
      { property: "og:description", content: "Dashboard do produtor — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_index,
});

function Page_admin_index() {
  return <AdminDashboard />;
}
