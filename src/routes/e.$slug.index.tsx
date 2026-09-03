import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PublicEventPage from "@/pages/PublicEventPage";

export const Route = createFileRoute("/e/$slug/")({
  validateSearch: (search) => z.object({ ref: z.string().optional() }).parse(search),
  head: () => ({
    meta: [
      { title: "Evento | TicketFlow" },
      { name: "description", content: "Garanta seu ingresso para este evento exclusivo." },
      { property: "og:title", content: "Evento | TicketFlow" },
      { property: "og:description", content: "Garanta seu ingresso para este evento exclusivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicEventPage,
});
