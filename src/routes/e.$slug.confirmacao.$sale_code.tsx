import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/e/$slug/confirmacao/$sale_code")({
  head: () => ({
    meta: [
      { title: "Confirmação de compra | TicketFlow" },
      { name: "description", content: "Confirmação de compra — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Confirmação de compra | TicketFlow" },
      { property: "og:description", content: "Confirmação de compra — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_e_slug_confirmacao_sale_code,
});

function Page_e_slug_confirmacao_sale_code() {
  const params = Route.useParams();
  return <Placeholder title="Confirmação de compra" description="Confirmação de compra — plataforma TicketFlow de gestão de eventos e ingressos." params={{ slug: params.slug, sale_code: params.sale_code }} />;
}
