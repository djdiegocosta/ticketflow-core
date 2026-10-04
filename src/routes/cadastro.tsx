import { createFileRoute } from "@tanstack/react-router";
import SignupPage from "@/pages/SignupPage";
import { safeReturnTo } from "@/lib/return-to";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>): { voltar?: string; [key: string]: unknown } => {
    const { voltar: rawVoltar, ...rest } = search;
    const voltar = safeReturnTo(rawVoltar);
    return voltar ? { ...rest, voltar } : { ...rest };
  },
  head: () => ({
    meta: [
      { title: "Cadastro | TicketFlow" },
      { name: "description", content: "Criação de conta completa." },
      { property: "og:title", content: "Cadastro | TicketFlow" },
      { property: "og:description", content: "Criação de conta completa." },
    ],
  }),
  component: SignupPage,
});
