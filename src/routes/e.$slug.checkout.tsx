import { createFileRoute } from "@tanstack/react-router";
import CheckoutPage from "@/pages/CheckoutPage";
import { z } from 'zod';
import { fetchEventMeta, buildEventMeta } from "@/lib/event-meta";

export const Route = createFileRoute("/e/$slug/checkout")({
  validateSearch: (search) => z.object({
    batchId: z.string().optional(),
    qty: z.string().optional(),
    ref: z.string().optional()
  }).parse(search),
  loader: ({ params }) => fetchEventMeta(params.slug),
  head: ({ loaderData }) => ({
    meta: buildEventMeta(loaderData, {
      titleSuffix: "Checkout",
      descriptionOverride: "Finalize sua compra com segurança.",
    }),
  }),
  component: CheckoutPage,
});
