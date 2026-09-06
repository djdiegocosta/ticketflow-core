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
  component: PublicEventPage,
});
