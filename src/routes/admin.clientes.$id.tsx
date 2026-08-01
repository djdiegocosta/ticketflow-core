import { createFileRoute, redirect } from "@tanstack/react-router";
import { ClientDetailPage } from "@/pages/admin/ClientDetailPage";

export const Route = createFileRoute("/admin/clientes/$id")({
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
      { title: "Ficha do cliente | TicketFlow" },
      { name: "description", content: "Ficha do cliente com dados de contato, métricas e histórico de compras." },
      { property: "og:title", content: "Ficha do cliente | TicketFlow" },
      { property: "og:description", content: "Ficha do cliente com dados de contato, métricas e histórico de compras." },
    ],
  }),
  component: Page_admin_clientes_id,
});

function Page_admin_clientes_id() {
  const params = Route.useParams();
  return <ClientDetailPage id={params.id} />;
}
