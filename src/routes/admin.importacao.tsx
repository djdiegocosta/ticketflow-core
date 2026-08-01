import { createFileRoute, redirect } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/importacao")({
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
      { title: "Importação | TicketFlow" },
      { name: "description", content: "Importação — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Importação | TicketFlow" },
      { property: "og:description", content: "Importação — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_importacao,
});

function Page_admin_importacao() {
  return <Placeholder title="Importação" description="Importação — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
