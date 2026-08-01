import { createFileRoute, redirect } from "@tanstack/react-router";
import { CreateEventPage } from "@/pages/admin/CreateEventPage";

export const Route = createFileRoute("/admin/eventos/novo")({
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
      { title: "Novo Evento | TicketFlow" },
      { name: "description", content: "Criar novo evento — plataforma TicketFlow." },
    ],
  }),
  component: CreateEventPage,
});
