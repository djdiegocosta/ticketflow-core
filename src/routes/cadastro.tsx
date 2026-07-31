import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro | TicketFlow" },
      { name: "description", content: "Criação de conta completa." },
      { property: "og:title", content: "Cadastro | TicketFlow" },
      { property: "og:description", content: "Criação de conta completa." },
    ],
  }),
  component: Page_cadastro,
});

function Page_cadastro() {
  return <Placeholder title="Cadastro" description="Criação de conta completa." />;
}
