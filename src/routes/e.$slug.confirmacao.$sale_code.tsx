import { createFileRoute } from "@tanstack/react-router";
import ConfirmationPage from "@/pages/ConfirmationPage";
import { fetchEventMeta, buildEventMeta } from "@/lib/event-meta";

export const Route = createFileRoute("/e/$slug/confirmacao/$sale_code")({
  loader: ({ params }) => fetchEventMeta(params.slug),
  head: ({ loaderData }) => ({
    meta: buildEventMeta(loaderData, {
      titleSuffix: "Confirmação",
      descriptionOverride: "Seu pedido foi processado com sucesso.",
    }),
  }),
  component: ConfirmationPage,
});
