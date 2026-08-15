import { createFileRoute, redirect } from "@tanstack/react-router";
import { CheckinHistoryPage } from "@/pages/CheckinHistoryPage";

export const Route = createFileRoute("/checkin/historico")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (!auth) {
      throw redirect({ to: '/login' });
    }
    try {
      const data = JSON.parse(auth);
      if (!data.isAuthenticated || (data.userRole !== 'operador_checkin' && data.userRole !== 'admin')) {
        throw redirect({ to: '/login' });
      }
    } catch (e) {
      throw redirect({ to: '/login' });
    }
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
