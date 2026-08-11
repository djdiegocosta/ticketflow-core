import { createFileRoute } from "@tanstack/react-router";
import ConfirmationPage from "@/pages/ConfirmationPage";

export const Route = createFileRoute("/e/$slug/confirmacao/$sale_code")({
  component: ConfirmationPage,
});
