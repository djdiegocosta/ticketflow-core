import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/eventos/novo")({
  head: () => ({
    meta: [
      { title: "Novo evento | TicketFlow" },
      { name: "description", content: "Novo evento — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Novo evento | TicketFlow" },
      { property: "og:description", content: "Novo evento — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_eventos_novo,
});

function Page_admin_eventos_novo() {
  return <Placeholder title="Novo evento" description="Novo evento — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
