import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios | TicketFlow" },
      { name: "description", content: "Relatórios — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Relatórios | TicketFlow" },
      { property: "og:description", content: "Relatórios — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_relatorios,
});

function Page_admin_relatorios() {
  return <Placeholder title="Relatórios" description="Relatórios — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
