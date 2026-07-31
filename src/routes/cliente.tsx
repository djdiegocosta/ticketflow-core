import { createFileRoute, redirect } from "@tanstack/react-router";
import { ClienteLayout } from "@/components/layouts/ClienteLayout";

export const Route = createFileRoute("/cliente")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (!auth) {
      throw redirect({ to: '/login' });
    }
    const data = JSON.parse(auth);
    if (!data.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: ClienteLayout,
});

