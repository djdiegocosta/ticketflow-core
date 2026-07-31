import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha | TicketFlow" },
      { name: "description", content: "Solicitação de link de recuperação." },
      { property: "og:title", content: "Recuperar senha | TicketFlow" },
      { property: "og:description", content: "Solicitação de link de recuperação." },
    ],
  }),
  component: Page_recuperar_senha,
});

function Page_recuperar_senha() {
  return <Placeholder title="Recuperar senha" description="Solicitação de link de recuperação." />;
}
