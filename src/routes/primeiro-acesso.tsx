import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { requireSession } from "@/lib/auth-guard";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/primeiro-acesso")({
  ssr: false,
  beforeLoad: async () => {
    const ctx = await requireSession();
    if (ctx.organizationId) {
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({
    meta: [
      { title: "Primeiro acesso | TicketFlow" },
      {
        name: "description",
        content: "Crie sua organização no TicketFlow e comece a vender ingressos.",
      },
      { property: "og:title", content: "Primeiro acesso | TicketFlow" },
      {
        property: "og:description",
        content: "Crie sua organização no TicketFlow e comece a vender ingressos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FirstAccessPage,
});

function FirstAccessPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Informe o nome da sua organização.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc("bootstrap_organization", { _name: name.trim() });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await refreshProfile();
    toast.success("Organização criada com sucesso!");
    navigate({ to: "/admin" });
  };

  return (
    <MobileLayout showFooter={false}>
      <div className="flex flex-col items-center justify-center p-4 py-12">
        <div className="mb-8">
          <h1 className="text-display text-accent font-bold">TicketFlow</h1>
        </div>

        <Card className="w-full max-w-[420px] bg-bg-secondary border-border-default shadow-md rounded-lg">
          <CardHeader className="pb-2 text-center">
            <h2 className="text-heading-1">Criar sua organização</h2>
            <p className="text-small text-text-secondary mt-2">
              Antes de começar, dê um nome à produtora que vai gerenciar os eventos.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="org-name" className="text-small font-medium">
                  Nome da organização
                </label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Produtora Aurora"
                  className="bg-bg-secondary border-border-default focus-visible:ring-accent"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent-hover text-[#111111] font-semibold rounded-md"
              >
                {loading ? "Criando..." : "Criar organização"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
