import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/admin/SettingsPage";

export const Route = createFileRoute("/admin/configuracoes/")({
  head: () => ({
    meta: [
      { title: "Configurações | TicketFlow" },
      { name: "description", content: "Configure organização, Mercado Pago, preferências e backup de dados no TicketFlow." },
      { property: "og:title", content: "Configurações | TicketFlow" },
      { property: "og:description", content: "Configure organização, Mercado Pago, preferências e backup de dados no TicketFlow." },
    ],
  }),
  component: SettingsPage,
});
