import { createFileRoute } from "@tanstack/react-router";
import { SalesListPage } from "@/pages/admin/SalesListPage";


export const Route = createFileRoute("/admin/vendas/")({
  head: () => ({
    meta: [
      { title: "Vendas | TicketFlow" },
      { name: "description", content: "Vendas — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Vendas | TicketFlow" },
      { property: "og:description", content: "Vendas — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_vendas_index,
});

function Page_admin_vendas_index() {
  return <Placeholder title="Vendas" description="Vendas — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
