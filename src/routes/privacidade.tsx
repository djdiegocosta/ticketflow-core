import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | TicketFlow" },
      { name: "description", content: "Política de privacidade do TicketFlow." },
    ],
  }),
  component: PrivacyPolicyPage,
});
