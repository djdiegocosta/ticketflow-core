import { createFileRoute } from "@tanstack/react-router";
import { CreateEventPage } from "@/pages/admin/CreateEventPage";

export const Route = createFileRoute("/admin/eventos/novo")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === "colaborador") {
      throw redirect({ to: "/admin/vendas" });
    }
  },
  head: () => ({
    meta: [
      { title: "Novo Evento | TicketFlow" },
      { name: "description", content: "Criar novo evento — plataforma TicketFlow." },
    ],
  }),
  component: CreateEventPage,
});
