import { createFileRoute, redirect } from "@tanstack/react-router";
import { EventHistoryListPage } from "@/pages/admin/EventHistoryListPage";

export const Route = createFileRoute("/admin/ferramentas/historico-eventos/")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === "colaborador") {
      throw redirect({ to: "/admin/vendas" });
    }
  },
  head: () => ({
    meta: [
      { title: "Histórico de Eventos | TicketFlow" },
      {
        name: "description",
        content: "Consulte os resultados e indicadores dos eventos realizados — TicketFlow.",
      },
    ],
  }),
  component: EventHistoryListPage,
});
