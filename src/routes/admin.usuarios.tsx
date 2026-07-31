import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários | TicketFlow" },
      { name: "description", content: "Usuários — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Usuários | TicketFlow" },
      { property: "og:description", content: "Usuários — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_usuarios,
});

function Page_admin_usuarios() {
  return <Placeholder title="Usuários" description="Usuários — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
