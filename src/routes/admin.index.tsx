import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminDashboard } from "@/pages/AdminDashboard";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async ({ context }) => {
    // A rota pai /admin já valida sessão e papel básico.
    // Aqui apenas tratamos o redirecionamento específico do colaborador.
    const ctx = (context as any).auth;
    if (ctx?.role === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
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
