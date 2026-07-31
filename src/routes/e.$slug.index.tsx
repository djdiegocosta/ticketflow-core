import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/e/$slug/")({
  head: () => ({
    meta: [
      { title: "Página pública do evento | TicketFlow" },
      { name: "description", content: "Página pública do evento — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Página pública do evento | TicketFlow" },
      { property: "og:description", content: "Página pública do evento — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_e_slug_index,
});

function Page_e_slug_index() {
  const params = Route.useParams();
  return <Placeholder title="Página pública do evento" description="Página pública do evento — plataforma TicketFlow de gestão de eventos e ingressos." params={{ slug: params.slug }} />;
}
