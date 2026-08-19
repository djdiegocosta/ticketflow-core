import { createFileRoute, redirect } from "@tanstack/react-router";
import { SimuladorPage } from "@/pages/admin/SimuladorPage";

export const Route = createFileRoute("/admin/simulador")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
  head: () => ({
    meta: [
      { title: "Simulador de Evento | TicketFlow" },
      { name: "description", content: "Projete receitas, custos, ponto de equilíbrio e cenários de ocupação antes do seu evento acontecer." },
      { property: "og:title", content: "Simulador de Evento | TicketFlow" },
      { property: "og:description", content: "Projete receitas, custos, ponto de equilíbrio e cenários de ocupação antes do seu evento acontecer." },
    ],
  }),
  component: SimuladorPage,
});
