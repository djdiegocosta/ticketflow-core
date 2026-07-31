import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | TicketFlow" },
      { name: "description", content: "Configurações — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Configurações | TicketFlow" },
      { property: "og:description", content: "Configurações — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_configuracoes,
});

function Page_admin_configuracoes() {
  return <Placeholder title="Configurações" description="Configurações — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
