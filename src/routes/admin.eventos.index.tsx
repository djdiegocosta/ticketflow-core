import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/eventos/")({
  head: () => ({
    meta: [
      { title: "Eventos | TicketFlow" },
      { name: "description", content: "Eventos — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Eventos | TicketFlow" },
      { property: "og:description", content: "Eventos — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_eventos_index,
});

function Page_admin_eventos_index() {
  return <Placeholder title="Eventos" description="Eventos — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
