import { createFileRoute } from "@tanstack/react-router";
import { SaleDetailPage } from "@/pages/admin/SaleDetailPage";


export const Route = createFileRoute("/admin/vendas/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da venda | TicketFlow" },
      { name: "description", content: "Detalhe da venda — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Detalhe da venda | TicketFlow" },
      { property: "og:description", content: "Detalhe da venda — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_vendas_id,
});

function Page_admin_vendas_id() {
  const params = Route.useParams();
  return <Placeholder title="Detalhe da venda" description="Detalhe da venda — plataforma TicketFlow de gestão de eventos e ingressos." params={{ id: params.id }} />;
}
