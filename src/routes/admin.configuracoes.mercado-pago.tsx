import { createFileRoute } from "@tanstack/react-router";
import { MercadoPagoWizardPage } from "@/pages/admin/MercadoPagoWizardPage";

export const Route = createFileRoute("/admin/configuracoes/mercado-pago")({
  head: () => ({
    meta: [
      { title: "Configurar Mercado Pago | TicketFlow" },
      { name: "description", content: "Assistente guiado em 5 etapas para configurar a integração do Mercado Pago com Pix automático." },
      { property: "og:title", content: "Configurar Mercado Pago | TicketFlow" },
      { property: "og:description", content: "Assistente guiado em 5 etapas para configurar a integração do Mercado Pago com Pix automático." },
    ],
  }),
  component: MercadoPagoWizardPage,
});
