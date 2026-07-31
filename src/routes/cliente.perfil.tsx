import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/cliente/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil | TicketFlow" },
      { name: "description", content: "Perfil — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Perfil | TicketFlow" },
      { property: "og:description", content: "Perfil — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_cliente_perfil,
});

function Page_cliente_perfil() {
  return <Placeholder title="Perfil" description="Perfil — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
