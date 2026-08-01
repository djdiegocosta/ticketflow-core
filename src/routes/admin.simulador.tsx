import { createFileRoute, redirect } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/simulador")({
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
      { title: "Simulador | TicketFlow" },
      { name: "description", content: "Simulador — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Simulador | TicketFlow" },
      { property: "og:description", content: "Simulador — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_simulador,
});

function Page_admin_simulador() {
  return <Placeholder title="Simulador" description="Simulador — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
