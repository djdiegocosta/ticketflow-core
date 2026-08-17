import { createFileRoute } from "@tanstack/react-router";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/organizacao-pendente")({
  head: () => ({
    meta: [
      { title: "Aguardando aprovação | TicketFlow" },
      { name: "description", content: "Sua organização está aguardando aprovação." },
    ],
  }),
  component: OrganizationPendingPage,
});

function OrganizationPendingPage() {
  return (
    <MobileLayout showFooter={false}>
      <div className="flex flex-col items-center justify-center p-4 py-12 min-h-[80dvh]">
        <div className="mb-8">
          <h1 className="text-display text-accent font-bold">TicketFlow</h1>
        </div>

        <Card className="w-full max-w-[420px] bg-bg-secondary border-border-default shadow-md rounded-none">
          <CardHeader className="pb-2 text-center flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-accent/10 flex items-center justify-center rounded-full">
              <Clock className="h-8 w-8 text-accent animate-pulse" />
            </div>
            <div>
              <h2 className="text-heading-1">Aguardando aprovação</h2>
              <p className="text-small text-text-secondary mt-2">
                Sua organização foi criada e está aguardando aprovação. Você será notificado assim que puder acessar o painel.
              </p>
            </div>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <p className="text-body text-text-muted">
              Isso geralmente leva menos de 24 horas. Enquanto isso, verifique seu e-mail para mais detalhes.
            </p>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
