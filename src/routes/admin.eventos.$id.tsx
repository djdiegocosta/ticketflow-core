import { createFileRoute, redirect } from "@tanstack/react-router";
import { EditEventPage } from "@/pages/admin/EditEventPage";

export const Route = createFileRoute("/admin/eventos/$id")({
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
      { title: "Editar Evento | TicketFlow" },
      { name: "description", content: "Gerenciar detalhes do evento — plataforma TicketFlow." },
    ],
  }),
  component: EditEventPage,
});
