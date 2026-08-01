import { createFileRoute, redirect } from "@tanstack/react-router";
import UsersListPage from "@/pages/admin/UsersListPage";

export const Route = createFileRoute("/admin/usuarios")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (!auth) throw redirect({ to: '/login' });
    
    const data = JSON.parse(auth);
    if (data.userRole !== 'admin') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
  head: () => ({
    meta: [
      { title: "Usuários | TicketFlow" },
      { name: "description", content: "Usuários — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Usuários | TicketFlow" },
      { property: "og:description", content: "Usuários — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: UsersListPage,
});
