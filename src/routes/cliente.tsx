import { createFileRoute } from "@tanstack/react-router";
import { ClienteLayout } from "@/components/layouts/ClienteLayout";

export const Route = createFileRoute("/cliente")({
  component: ClienteLayout,
});
