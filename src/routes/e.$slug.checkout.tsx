import { createFileRoute } from "@tanstack/react-router";
import CheckoutPage from "@/pages/CheckoutPage";
import { z } from 'zod';

export const Route = createFileRoute("/e/$slug/checkout")({
  validateSearch: (search) => z.object({
    batchId: z.string().optional(),
    qty: z.string().optional()
  }).parse(search),
  component: CheckoutPage,
});
