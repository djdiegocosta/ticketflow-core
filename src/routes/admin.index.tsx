import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminDashboard } from "@/pages/AdminDashboard";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async ({ context }) => {
    // Rely on the parent route /admin which already calls requireSession()
    // but just to be safe and specific for this index:
    if (typeof window === 'undefined') return;
    
    // Cleanup legacy mock logic that used window.localStorage directly
    // and was causing hydration/state mismatches
  },
  head: () => ({
    meta: [
      { title: "Dashboard | TicketFlow" },
      { name: "description", content: "Dashboard do produtor — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Dashboard | TicketFlow" },
      { property: "og:description", content: "Dashboard do produtor — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_index,
});

function Page_admin_index() {
  return <AdminDashboard />;
}
