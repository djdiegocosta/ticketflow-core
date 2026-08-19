import { createFileRoute, redirect } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/sorteios")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
  head: () => ({
    meta: [
      { title: "Sorteios | TicketFlow" },
      { name: "description", content: "Sorteios — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Sorteios | TicketFlow" },
      { property: "og:description", content: "Sorteios — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_sorteios,
});

function Page_admin_sorteios() {
  return <Placeholder title="Sorteios" description="Sorteios — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
