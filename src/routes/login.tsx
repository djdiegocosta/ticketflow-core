import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginPage from "@/pages/LoginPage";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const auth = localStorage.getItem('ticketflow_auth');
    if (auth) {
      const data = JSON.parse(auth);
      if (data.isAuthenticated && data.userRole === 'admin') {
        throw redirect({ to: '/admin' });
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
