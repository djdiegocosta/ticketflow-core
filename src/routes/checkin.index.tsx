import { createFileRoute, redirect } from "@tanstack/react-router";
import { CheckinPage } from "@/pages/CheckinPage";
import { requireSession } from "@/lib/auth-guard";

export const Route = createFileRoute("/checkin/")({
  ssr: false,
  beforeLoad: async () => {
    const ctx = await requireSession();
    if (ctx.role !== "operador_checkin" && ctx.role !== "admin" && ctx.role !== "colaborador") {
      throw redirect({ to: "/cliente" });
    }
    return { auth: ctx };
  },
  head: () => ({
    meta: [
      { title: "Check-in | TicketFlow" },
      {
        name: "description",
        content: "Leia o QR Code dos ingressos e valide a entrada dos participantes em tempo real.",
      },
      { property: "og:title", content: "Check-in | TicketFlow" },
      {
        property: "og:description",
        content: "Leia o QR Code dos ingressos e valide a entrada dos participantes em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckinPage,
});
