import { createFileRoute } from "@tanstack/react-router";
import { EditEventPage } from "@/pages/admin/EditEventPage";

export const Route = createFileRoute("/admin/eventos/$id")({
  head: () => ({
    meta: [
      { title: "Editar Evento | TicketFlow" },
      { name: "description", content: "Gerenciar detalhes do evento — plataforma TicketFlow." },
    ],
  }),
  component: EditEventPage,
});
