import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/remarketing")({
  head: () => ({
    meta: [
      { title: "Remarketing | TicketFlow" },
      { name: "description", content: "Remarketing — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Remarketing | TicketFlow" },
      { property: "og:description", content: "Remarketing — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_remarketing,
});

function Page_admin_remarketing() {
  return <Placeholder title="Remarketing" description="Remarketing — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
