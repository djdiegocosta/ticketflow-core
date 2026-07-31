import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/cliente/pontos")({
  head: () => ({
    meta: [
      { title: "Pontos | TicketFlow" },
      { name: "description", content: "Pontos — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Pontos | TicketFlow" },
      { property: "og:description", content: "Pontos — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_cliente_pontos,
});

function Page_cliente_pontos() {
  return <Placeholder title="Pontos" description="Pontos — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
