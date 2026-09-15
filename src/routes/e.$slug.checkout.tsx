import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import CheckoutPage from "@/pages/CheckoutPage";
import { z } from 'zod';
import { fetchEventMeta, buildEventMeta } from "@/lib/event-meta";

export const Route = createFileRoute("/e/$slug/checkout")({
  validateSearch: (search) => z.object({
    batchId: z.string().optional(),
    qty: z.string().optional(),
    ref: z.string().optional(),
    resume: z.string().uuid().optional()
  }).parse(search),
  loader: ({ params }) => fetchEventMeta(params.slug),
  head: ({ loaderData }) => ({
    meta: buildEventMeta(loaderData, {
      titleSuffix: "Checkout",
      descriptionOverride: "Finalize sua compra com segurança.",
    }),
  }),
  component: CheckoutRoutePage,
});

function CheckoutRoutePage() {
  const event = Route.useLoaderData();
  const { slug } = Route.useParams();

  useEffect(() => {
    if (!event || typeof window === "undefined") return;

    const storageKey = `ticketflow_meta_initiate_checkout:${slug}`;
    if (window.sessionStorage.getItem(storageKey)) return;

    const fbq = (window as typeof window & {
      fbq?: (...args: unknown[]) => void;
    }).fbq;

    if (typeof fbq !== "function") return;

    fbq("track", "InitiateCheckout", {
      content_name: event.title,
      content_type: "event",
      content_ids: [slug],
    });

    window.sessionStorage.setItem(storageKey, "1");
  }, [event, slug]);

  return <CheckoutPage />;
}
