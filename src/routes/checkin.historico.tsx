import { createFileRoute, redirect } from "@tanstack/react-router";
import { CheckinHistoryPage } from "@/pages/CheckinHistoryPage";
import { requireSession } from "@/lib/auth-guard";

export const Route = createFileRoute("/checkin/historico")({
  ssr: false,
  beforeLoad: async () => {
    const ctx = await requireSession();
    if (ctx.role !== "operador_checkin" && ctx.role !== "admin" && ctx.role !== "colaborador") {
      throw redirect({ to: "/cliente" });
    }
    return { auth: ctx };
  },
  head: () => ({
    meta: [
      { title: "Histórico de Check-in | TicketFlow" },
      {
        name: "description",
        content: "Registro operacional de todas as tentativas de check-in: entradas válidas, duplicidades e inválidas.",
      },
      { property: "og:title", content: "Histórico de Check-in | TicketFlow" },
      {
        property: "og:description",
        content: "Registro operacional de todas as tentativas de check-in: entradas válidas, duplicidades e inválidas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckinHistoryPage,
});
