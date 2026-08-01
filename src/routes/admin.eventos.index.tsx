import { createFileRoute } from "@tanstack/react-router";
import { EventsListPage } from "@/pages/admin/EventsListPage";

export const Route = createFileRoute("/admin/eventos/index")({
  head: () => ({
    meta: [
      { title: "Eventos | TicketFlow" },
      { name: "description", content: "Listagem de eventos — plataforma TicketFlow." },
    ],
  }),
  component: EventsListPage,
});
