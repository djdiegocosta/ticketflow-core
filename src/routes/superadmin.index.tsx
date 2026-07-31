import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/superadmin/")({
  head: () => ({
    meta: [
      { title: "Super Admin | TicketFlow" },
      { name: "description", content: "Super Admin — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Super Admin | TicketFlow" },
      { property: "og:description", content: "Super Admin — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_superadmin_index,
});

function Page_superadmin_index() {
  return <Placeholder title="Super Admin" description="Super Admin — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
