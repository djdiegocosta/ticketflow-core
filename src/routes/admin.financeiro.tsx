import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro | TicketFlow" },
      { name: "description", content: "Financeiro — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Financeiro | TicketFlow" },
      { property: "og:description", content: "Financeiro — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_financeiro,
});

function Page_admin_financeiro() {
  return <Placeholder title="Financeiro" description="Financeiro — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
