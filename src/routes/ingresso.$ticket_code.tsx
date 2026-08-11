import { createFileRoute } from "@tanstack/react-router";
import TicketDetailPage from "@/pages/TicketDetailPage";

export const Route = createFileRoute("/ingresso/$ticket_code")({
  head: () => ({
    meta: [
      { title: "Seu Ingresso | TicketFlow" },
      { name: "description", content: "Apresente este QR Code na entrada do evento." },
      { property: "og:title", content: "Seu Ingresso | TicketFlow" },
      { property: "og:description", content: "Apresente este QR Code na entrada do evento." },
    ],
  }),
  component: TicketDetailPage,
});
