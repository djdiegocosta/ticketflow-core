import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/meus-ingressos")({
  head: () => ({
    meta: [
      { title: "Meus ingressos | TicketFlow" },
      { name: "description", content: "Busca de ingressos por código." },
      { property: "og:title", content: "Meus ingressos | TicketFlow" },
      { property: "og:description", content: "Busca de ingressos por código." },
    ],
  }),
  component: Page_meus_ingressos,
});

function Page_meus_ingressos() {
  return <Placeholder title="Meus ingressos" description="Busca de ingressos por código." />;
}
