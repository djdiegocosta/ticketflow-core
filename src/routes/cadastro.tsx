import { createFileRoute } from "@tanstack/react-router";
import SignupPage from "@/pages/SignupPage";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro | TicketFlow" },
      { name: "description", content: "Criação de conta completa." },
      { property: "og:title", content: "Cadastro | TicketFlow" },
      { property: "og:description", content: "Criação de conta completa." },
    ],
  }),
  component: SignupPage,
});
