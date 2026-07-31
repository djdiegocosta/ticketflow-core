import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do cliente | TicketFlow" },
      { name: "description", content: "Ficha do cliente — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Ficha do cliente | TicketFlow" },
      { property: "og:description", content: "Ficha do cliente — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_clientes_id,
});

function Page_admin_clientes_id() {
  const params = Route.useParams();
  return <Placeholder title="Ficha do cliente" description="Ficha do cliente — plataforma TicketFlow de gestão de eventos e ingressos." params={{ id: params.id }} />;
}
