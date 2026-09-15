import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PublicEventPage from "@/pages/PublicEventPage";
import { fetchEventMeta, buildEventMeta } from "@/lib/event-meta";

export const Route = createFileRoute("/e/$slug/")({
  validateSearch: (search) => z.object({ ref: z.string().optional() }).parse(search),
  loader: ({ params }) => fetchEventMeta(params.slug),
  head: ({ loaderData }) => ({
    meta: buildEventMeta(loaderData),
  }),
  component: PublicEventRoutePage,
});

function PublicEventRoutePage() {
  const event = Route.useLoaderData();
  const { slug } = Route.useParams();

  useEffect(() => {
    if (!event || typeof window === "undefined") return;

    const fbq = (window as typeof window & {
      fbq?: (...args: unknown[]) => void;
    }).fbq;

    if (typeof fbq !== "function") return;

    fbq("track", "ViewContent", {
      content_name: event.title,
      content_type: "event",
      content_ids: [slug],
    });
  }, [event, slug]);

  return <PublicEventPage />;
}
