import { createFileRoute, redirect } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/financeiro")({
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
      { title: "Financeiro | TicketFlow" },
      { name: "description", content: "Financeiro — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Financeiro | TicketFlow" },
      { property: "og:description", content: "Financeiro — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_financeiro,
});

function Page_admin_financeiro() {
  return <Placeholder title="Financeiro" description="Financeiro — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
