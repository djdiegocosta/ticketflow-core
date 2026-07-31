import { createFileRoute } from "@tanstack/react-router";
import ResetPasswordPage from "@/pages/ResetPasswordPage";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha | TicketFlow" },
      { name: "description", content: "Definição de nova senha." },
      { property: "og:title", content: "Redefinir senha | TicketFlow" },
      { property: "og:description", content: "Definição de nova senha." },
    ],
  }),
  component: ResetPasswordPage,
});
