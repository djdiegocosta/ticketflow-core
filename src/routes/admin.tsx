import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts/AdminLayout";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    const auth = localStorage.getItem('ticketflow_auth');
    if (!auth) {
      throw redirect({ to: '/login' });
    }
    const data = JSON.parse(auth);
    if (!data.isAuthenticated || data.userRole !== 'admin') {
      throw redirect({ to: '/login' });
    }
  },
  component: AdminLayout,
});
