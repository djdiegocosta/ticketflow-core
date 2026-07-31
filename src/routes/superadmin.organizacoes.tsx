import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/superadmin/organizacoes")({
  head: () => ({
    meta: [
      { title: "Organizações | TicketFlow" },
      { name: "description", content: "Organizações — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Organizações | TicketFlow" },
      { property: "og:description", content: "Organizações — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_superadmin_organizacoes,
});

function Page_superadmin_organizacoes() {
  return <Placeholder title="Organizações" description="Organizações — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
