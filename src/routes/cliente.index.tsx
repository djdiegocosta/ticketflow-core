import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/cliente/")({
  head: () => ({
    meta: [
      { title: "Área do cliente | TicketFlow" },
      { name: "description", content: "Resumo das compras e pontos." },
      { property: "og:title", content: "Área do cliente | TicketFlow" },
      { property: "og:description", content: "Resumo das compras e pontos." },
    ],
  }),
  component: Page_cliente_index,
});

function Page_cliente_index() {
  return <Placeholder title="Área do cliente" description="Resumo das compras e pontos." />;
}
