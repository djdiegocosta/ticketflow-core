import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/cortesias")({
  head: () => ({
    meta: [
      { title: "Cortesias | TicketFlow" },
      { name: "description", content: "Cortesias — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Cortesias | TicketFlow" },
      { property: "og:description", content: "Cortesias — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_cortesias,
});

function Page_admin_cortesias() {
  return <Placeholder title="Cortesias" description="Cortesias — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
