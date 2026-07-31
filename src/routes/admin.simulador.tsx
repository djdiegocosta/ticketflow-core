import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador | TicketFlow" },
      { name: "description", content: "Simulador — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Simulador | TicketFlow" },
      { property: "og:description", content: "Simulador — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_simulador,
});

function Page_admin_simulador() {
  return <Placeholder title="Simulador" description="Simulador — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
