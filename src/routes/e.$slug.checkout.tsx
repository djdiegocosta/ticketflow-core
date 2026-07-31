import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/e/$slug/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | TicketFlow" },
      { name: "description", content: "Checkout — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Checkout | TicketFlow" },
      { property: "og:description", content: "Checkout — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_e_slug_checkout,
});

function Page_e_slug_checkout() {
  const params = Route.useParams();
  return <Placeholder title="Checkout" description="Checkout — plataforma TicketFlow de gestão de eventos e ingressos." params={{ slug: params.slug }} />;
}
