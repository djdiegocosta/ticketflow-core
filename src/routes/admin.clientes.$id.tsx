import { createFileRoute } from "@tanstack/react-router";
import { ClientDetailPage } from "@/pages/admin/ClientDetailPage";

export const Route = createFileRoute("/admin/clientes/$id")({
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
