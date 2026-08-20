import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/admin/SettingsPage";

export const Route = createFileRoute("/admin/configuracoes")({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
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
