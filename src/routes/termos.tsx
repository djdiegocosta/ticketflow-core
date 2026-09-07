import { createFileRoute } from "@tanstack/react-router";
import TermsPage from "@/pages/TermsPage";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | TicketFlow" },
      { name: "description", content: "Termos de uso do TicketFlow." },
    ],
  }),
  component: TermsPage,
});
