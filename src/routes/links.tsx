import { createFileRoute } from "@tanstack/react-router";
import LinksPage from "@/pages/LinksPage";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "TicketFlow — Ingressos e eventos" },
      {
        name: "description",
        content: "Compre seu ingresso, crie sua conta ou acesse o TicketFlow.",
      },
      { property: "og:title", content: "TicketFlow — Ingressos e eventos" },
      {
        property: "og:description",
        content: "Compre seu ingresso, crie sua conta ou acesse o TicketFlow.",
      },
    ],
  }),
  component: LinksPage,
});
