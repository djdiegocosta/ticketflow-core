import { createFileRoute, redirect } from "@tanstack/react-router";
import { MercadoPagoWizardPage } from "@/pages/admin/MercadoPagoWizardPage";

export const Route = createFileRoute("/admin/configuracoes/mercado-pago")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (!auth) throw redirect({ to: '/login' });
    
    const data = JSON.parse(auth);
    if (data.userRole === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
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
