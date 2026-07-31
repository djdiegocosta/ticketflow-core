import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/cliente/ingressos")({
  head: () => ({
    meta: [
      { title: "Meus ingressos | TicketFlow" },
      { name: "description", content: "Meus ingressos — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Meus ingressos | TicketFlow" },
      { property: "og:description", content: "Meus ingressos — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_cliente_ingressos,
});

function Page_cliente_ingressos() {
  return <Placeholder title="Meus ingressos" description="Meus ingressos — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
