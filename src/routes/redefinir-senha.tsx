import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha | TicketFlow" },
      { name: "description", content: "Definição de nova senha." },
      { property: "og:title", content: "Redefinir senha | TicketFlow" },
      { property: "og:description", content: "Definição de nova senha." },
    ],
  }),
  component: Page_redefinir_senha,
});

function Page_redefinir_senha() {
  return <Placeholder title="Redefinir senha" description="Definição de nova senha." />;
}
