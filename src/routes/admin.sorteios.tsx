import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/sorteios")({
  head: () => ({
    meta: [
      { title: "Sorteios | TicketFlow" },
      { name: "description", content: "Sorteios — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Sorteios | TicketFlow" },
      { property: "og:description", content: "Sorteios — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_sorteios,
});

function Page_admin_sorteios() {
  return <Placeholder title="Sorteios" description="Sorteios — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
