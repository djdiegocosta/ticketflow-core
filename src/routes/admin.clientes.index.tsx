import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes | TicketFlow" },
      { name: "description", content: "Clientes — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Clientes | TicketFlow" },
      { property: "og:description", content: "Clientes — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_clientes_index,
});

function Page_admin_clientes_index() {
  return <Placeholder title="Clientes" description="Clientes — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
