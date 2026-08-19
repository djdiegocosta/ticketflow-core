import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "TicketFlow — Gestão de eventos e venda de ingressos" },
      {
        name: "description",
        content:
          "Plataforma TicketFlow: gestão de eventos, venda de ingressos, check-in e financeiro para produtores.",
      },
      { property: "og:title", content: "TicketFlow — Gestão de eventos e ingressos" },
      {
        property: "og:description",
        content: "Plataforma completa para produtores gerenciarem eventos e venderem ingressos.",
      },
    ],
  }),
  component: () => null,
});
