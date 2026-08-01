import { createFileRoute, redirect } from "@tanstack/react-router";
import { EventsListPage } from "@/pages/admin/EventsListPage";

export const Route = createFileRoute("/admin/eventos/")({
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
      { title: "Eventos | TicketFlow" },
      { name: "description", content: "Listagem de eventos — plataforma TicketFlow." },
    ],
  }),
  component: EventsListPage,
});
