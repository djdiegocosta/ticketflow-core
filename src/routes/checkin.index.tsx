import { createFileRoute } from "@tanstack/react-router";
import { CheckinPage } from "@/pages/CheckinPage";

export const Route = createFileRoute("/checkin/")({
  head: () => ({
    meta: [
      { title: "Check-in | TicketFlow" },
      {
        name: "description",
        content: "Leia o QR Code dos ingressos e valide a entrada dos participantes em tempo real.",
      },
      { property: "og:title", content: "Check-in | TicketFlow" },
      {
        property: "og:description",
        content: "Leia o QR Code dos ingressos e valide a entrada dos participantes em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckinPage,
});
