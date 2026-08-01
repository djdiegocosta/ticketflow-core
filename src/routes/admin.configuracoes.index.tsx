import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/admin/SettingsPage";

export const Route = createFileRoute("/admin/configuracoes/")({
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
      { title: "Configurações | TicketFlow" },
      { name: "description", content: "Configure organização, Mercado Pago, preferências e backup de dados no TicketFlow." },
      { property: "og:title", content: "Configurações | TicketFlow" },
      { property: "og:description", content: "Configure organização, Mercado Pago, preferências e backup de dados no TicketFlow." },
    ],
  }),
  component: SettingsPage,
});
