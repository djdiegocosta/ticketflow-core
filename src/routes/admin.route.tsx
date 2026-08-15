import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts/AdminLayout";

export const Route = createFileRoute("/admin")({
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
    
    if (data.userRole === 'operador_checkin') {
      throw redirect({ to: '/checkin' });
    }

    if (data.userRole !== 'admin' && data.userRole !== 'colaborador') {
      throw redirect({ to: '/login' });
    }
  },
  component: AdminLayout,
});

