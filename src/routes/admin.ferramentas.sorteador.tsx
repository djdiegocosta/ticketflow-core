import { createFileRoute } from "@tanstack/react-router";
import { SorteadorPage } from "@/pages/admin/SorteadorPage";

export const Route = createFileRoute("/admin/ferramentas/sorteador")({
  head: () => ({
    meta: [
      { title: "Sorteador | TicketFlow" },
      { name: "description", content: "Crie sorteios a partir dos participantes dos eventos." },
    ],
  }),
  component: SorteadorPage,
});
