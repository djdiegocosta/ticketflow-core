import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/pages/AdminDashboard";

export const Route = createFileRoute("/admin/")({
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
