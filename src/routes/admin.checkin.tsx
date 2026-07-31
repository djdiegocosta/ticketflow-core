import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/admin/checkin")({
  head: () => ({
    meta: [
      { title: "Check-in | TicketFlow" },
      { name: "description", content: "Check-in — plataforma TicketFlow de gestão de eventos e ingressos." },
      { property: "og:title", content: "Check-in | TicketFlow" },
      { property: "og:description", content: "Check-in — plataforma TicketFlow de gestão de eventos e ingressos." },
    ],
  }),
  component: Page_admin_checkin,
});

function Page_admin_checkin() {
  return <Placeholder title="Check-in" description="Check-in — plataforma TicketFlow de gestão de eventos e ingressos." />;
}
