import { createFileRoute } from "@tanstack/react-router";
import { ClientsListPage } from "@/pages/admin/ClientsListPage";

export const Route = createFileRoute("/admin/clientes/")({
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
