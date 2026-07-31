import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/superadmin/planos")({
  head: () => ({
    meta: [
      { title: "Planos | TicketFlow" },
      { name: "description", content: "Planos — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Planos | TicketFlow" },
      { property: "og:description", content: "Planos — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_superadmin_planos,
});

function Page_superadmin_planos() {
  return <Placeholder title="Planos" description="Planos — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
