import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/eventos/$id")({
  head: () => ({
    meta: [
      { title: "Editar evento | TicketFlow" },
      { name: "description", content: "Editar evento — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Editar evento | TicketFlow" },
      { property: "og:description", content: "Editar evento — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_eventos_id,
});

function Page_admin_eventos_id() {
  const params = Route.useParams();
  return <Placeholder title="Editar evento" description="Editar evento — plataforma TicketFlow de gestão de eventos e ingressos." params={{ id: params.id }} />;
}
