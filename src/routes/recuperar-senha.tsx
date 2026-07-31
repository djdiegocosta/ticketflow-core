import { createFileRoute } from "@tanstack/react-router";
import RecoverPasswordPage from "@/pages/RecoverPasswordPage";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha | TicketFlow" },
      { name: "description", content: "Solicitação de link de recuperação." },
      { property: "og:title", content: "Recuperar senha | TicketFlow" },
      { property: "og:description", content: "Solicitação de link de recuperação." },
    ],
  }),
  component: RecoverPasswordPage,
});
