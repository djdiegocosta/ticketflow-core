import { createFileRoute } from "@tanstack/react-router";
import ConfirmationPage from "@/pages/ConfirmationPage";

export const Route = createFileRoute("/e/$slug/confirmacao/$sale_code")({
  head: () => ({
    meta: [
      { title: "Confirmação | TicketFlow" },
      { name: "description", content: "Seu pedido foi processado com sucesso." },
      { property: "og:title", content: "Confirmação | TicketFlow" },
      { property: "og:description", content: "Seu pedido foi processado com sucesso." },
    ],
  }),
  component: ConfirmationPage,
});
