import { createFileRoute } from "@tanstack/react-router";
import CheckoutPage from "@/pages/CheckoutPage";
import { z } from 'zod';

export const Route = createFileRoute("/e/$slug/checkout")({
  validateSearch: (search) => z.object({
    batchId: z.string().optional(),
    qty: z.string().optional(),
    ref: z.string().optional()
  }).parse(search),
  head: () => ({
    meta: [
      { title: "Checkout | TicketFlow" },
      { name: "description", content: "Finalize sua compra com segurança." },
      { property: "og:title", content: "Checkout | TicketFlow" },
      { property: "og:description", content: "Finalize sua compra com segurança." },
    ],
  }),
  component: CheckoutPage,
});
