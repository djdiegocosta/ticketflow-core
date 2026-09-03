import { createFileRoute, redirect } from "@tanstack/react-router";
import { SalesLinksPage } from "@/pages/admin/SalesLinksPage";

export const Route = createFileRoute("/admin/ferramentas/links-de-venda")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === "colaborador") {
      throw redirect({ to: "/admin/vendas" });
    }
  },
  head: () => ({
    meta: [
      { title: "Links de Venda | TicketFlow" },
      {
        name: "description",
        content: "Veja de onde vêm suas vendas por canal de divulgação no TicketFlow.",
      },
      { property: "og:title", content: "Links de Venda | TicketFlow" },
      {
        property: "og:description",
        content: "Veja de onde vêm suas vendas por canal de divulgação no TicketFlow.",
      },
    ],
  }),
  component: SalesLinksPage,
});
