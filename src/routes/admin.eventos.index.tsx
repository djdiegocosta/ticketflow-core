import { createFileRoute, redirect } from "@tanstack/react-router";
import { EventsListPage } from "@/pages/admin/EventsListPage";

export const Route = createFileRoute("/admin/eventos")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
  head: () => ({
    meta: [
      { title: "Eventos | TicketFlow" },
      { name: "description", content: "Listagem de eventos — plataforma TicketFlow." },
    ],
  }),
  component: EventsListPage,
});
