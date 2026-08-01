import { createFileRoute, redirect } from "@tanstack/react-router";
import { RemarketingPage } from "@/pages/admin/RemarketingPage";

export const Route = createFileRoute("/admin/remarketing")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (!auth) throw redirect({ to: '/login' });
    
    const data = JSON.parse(auth);
    if (data.userRole === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
  head: () => ({
    meta: [
      { title: "Remarketing | TicketFlow" },
      {
        name: "description",
        content:
          "Recupere compradores que abandonaram a compra: métricas por período, modelos de mensagem e lista de abandonos.",
      },
      { property: "og:title", content: "Remarketing | TicketFlow" },
      {
        property: "og:description",
        content:
          "Recupere compradores que abandonaram a compra: métricas por período, modelos de mensagem e lista de abandonos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RemarketingPage,
});
