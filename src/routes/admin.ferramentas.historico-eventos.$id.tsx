import { createFileRoute, redirect } from "@tanstack/react-router";
import { EventHistoryDetailPage } from "@/pages/admin/EventHistoryDetailPage";

export const Route = createFileRoute("/admin/ferramentas/historico-eventos/$id")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === "colaborador") {
      throw redirect({ to: "/admin/vendas" });
    }
  },
  head: () => ({
    meta: [
      { title: "Detalhe do evento | Histórico de Eventos | TicketFlow" },
      {
        name: "description",
        content: "Resultado completo de um evento encerrado — TicketFlow.",
      },
    ],
  }),
  component: Page_admin_ferramentas_historico_eventos_id,
});

function Page_admin_ferramentas_historico_eventos_id() {
  const params = Route.useParams();
  return <EventHistoryDetailPage id={params.id} />;
}
