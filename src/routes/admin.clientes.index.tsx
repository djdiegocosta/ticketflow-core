import { createFileRoute, redirect } from "@tanstack/react-router";
import { ClientsListPage } from "@/pages/admin/ClientsListPage";

export const Route = createFileRoute("/admin/clientes/")({
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
      { title: "Clientes | TicketFlow" },
      { name: "description", content: "Base de clientes, ranking Top 10 e histórico de compras no TicketFlow." },
      { property: "og:title", content: "Clientes | TicketFlow" },
      { property: "og:description", content: "Base de clientes, ranking Top 10 e histórico de compras no TicketFlow." },
    ],
  }),
  component: Page_admin_clientes_index,
});

function Page_admin_clientes_index() {
  return <ClientsListPage />;
}
