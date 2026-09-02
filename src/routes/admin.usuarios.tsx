import { createFileRoute } from "@tanstack/react-router";
import UsersListPage from "@/pages/admin/UsersListPage";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários | TicketFlow" },
      {
        name: "description",
        content: "Usuários — plataforma TicketFlow de gestão de eventos e ingressos.",
      },
      { property: "og:title", content: "Usuários | TicketFlow" },
      {
        property: "og:description",
        content: "Usuários — plataforma TicketFlow de gestão de eventos e ingressos.",
      },
    ],
  }),
  component: UsersListPage,
});
