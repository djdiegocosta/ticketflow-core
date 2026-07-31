import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard do produtor | TicketFlow" },
      { name: "description", content: "Dashboard do produtor — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Dashboard do produtor | TicketFlow" },
      { property: "og:description", content: "Dashboard do produtor — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_index,
});

function Page_admin_index() {
  return <Placeholder title="Dashboard do produtor" description="Dashboard do produtor — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
