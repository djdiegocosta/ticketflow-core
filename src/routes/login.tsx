import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginPage from "@/pages/LoginPage";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (auth) {
      const data = JSON.parse(auth);
      if (data.isAuthenticated) {
        if (data.userRole === 'admin') throw redirect({ to: '/admin' });
        if (data.userRole === 'cliente') throw redirect({ to: '/cliente' });
        if (data.userRole === 'operador_checkin') throw redirect({ to: '/checkin' });
      }
    }
  },

  head: () => ({
    meta: [
      { title: "Login | TicketFlow" },
      { name: "description", content: "Tela de acesso do produtor e do cliente." },
      { property: "og:title", content: "Login | TicketFlow" },
      { property: "og:description", content: "Tela de acesso do produtor e do cliente." },
    ],
  }),
  component: LoginPage,
});
