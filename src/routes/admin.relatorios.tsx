import { createFileRoute, redirect } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/relatorios")({
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
      { title: "Relatórios | TicketFlow" },
      { name: "description", content: "Relatórios — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Relatórios | TicketFlow" },
      { property: "og:description", content: "Relatórios — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_relatorios,
});

function Page_admin_relatorios() {
  return <Placeholder title="Relatórios" description="Relatórios — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
