import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/ingresso/$ticket_code")({
  head: () => ({
    meta: [
      { title: "Ingresso | TicketFlow" },
      { name: "description", content: "Ingresso — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Ingresso | TicketFlow" },
      { property: "og:description", content: "Ingresso — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_ingresso_ticket_code,
});

function Page_ingresso_ticket_code() {
  const params = Route.useParams();
  return <Placeholder title="Ingresso" description="Ingresso — plataforma TicketFlow de gestão de eventos e ingressos." params={{ ticket_code: params.ticket_code }} />;
}
