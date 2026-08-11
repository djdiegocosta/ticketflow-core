import { createFileRoute } from "@tanstack/react-router";
import MyTicketsPage from "@/pages/MyTicketsPage";

export const Route = createFileRoute("/meus-ingressos")({
  head: () => ({
    meta: [
      { title: "Meus Ingressos | TicketFlow" },
      { name: "description", content: "Acesse seus ingressos e histórico de compras." },
      { property: "og:title", content: "Meus Ingressos | TicketFlow" },
      { property: "og:description", content: "Acesse seus ingressos e histórico de compras." },
    ],
  }),
  component: MyTicketsPage,
});
