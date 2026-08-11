import { createFileRoute, redirect } from "@tanstack/react-router";
import { MobileLayout } from "@/components/layouts/MobileLayout";

export const Route = createFileRoute("/cliente")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (!auth) {
      throw redirect({ to: '/login' });
    }
    try {
      const data = JSON.parse(auth);
      if (!data.isAuthenticated || data.userRole !== 'cliente') {
        throw redirect({ to: '/login' });
      }
    } catch (e) {
      throw redirect({ to: '/login' });
    }
  },
  component: MobileLayout,
});
