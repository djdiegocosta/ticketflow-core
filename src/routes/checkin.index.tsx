import { createFileRoute, redirect } from "@tanstack/react-router";
import { CheckinPage } from "@/pages/CheckinPage";

export const Route = createFileRoute("/checkin/")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (!auth) {
      throw redirect({ to: '/login' });
    }
    try {
      const data = JSON.parse(auth);
      if (!data.isAuthenticated || data.userRole !== 'operador_checkin') {
        // Se for admin, até poderia acessar, mas o requisito diz que operador_checkin é restrito a /checkin
        // e por simetria vamos restringir /checkin apenas a esse papel ou admin (opcional)
        // O pedido diz: "login como operador_checkin deve redirecionar direto para /checkin"
        // E "Qualquer tentativa de navegação para outra rota deve redirecionar de volta para /checkin"
        // Então /checkin é a "home" dele.
        if (data.userRole !== 'admin' && data.userRole !== 'operador_checkin') {
           throw redirect({ to: '/login' });
        }
      }
    } catch (e) {
      throw redirect({ to: '/login' });
    }
  },
  head: () => ({
    meta: [
      { title: "Check-in | TicketFlow" },
      {
        name: "description",
        content: "Leia o QR Code dos ingressos e valide a entrada dos participantes em tempo real.",
      },
      { property: "og:title", content: "Check-in | TicketFlow" },
      {
        property: "og:description",
        content: "Leia o QR Code dos ingressos e valide a entrada dos participantes em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckinPage,
});
