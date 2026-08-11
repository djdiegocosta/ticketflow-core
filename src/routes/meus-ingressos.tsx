import { createFileRoute } from "@tanstack/react-router";
import MyTicketsPage from "@/pages/MyTicketsPage";

export const Route = createFileRoute("/meus-ingressos")({
  component: MyTicketsPage,
});
