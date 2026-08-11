import { createFileRoute } from "@tanstack/react-router";
import TicketDetailPage from "@/pages/TicketDetailPage";

export const Route = createFileRoute("/ingresso/$ticket_code")({
  component: TicketDetailPage,
});
