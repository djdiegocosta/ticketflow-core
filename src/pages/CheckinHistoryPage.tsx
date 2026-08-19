import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function CheckinHistoryPage() {
  const navigate = useNavigate();
  const { organizationId } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["checkin-logs", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("checkin_log")
        .select(`
          id,
          participant_name,
          ticket_code,
          result,
          created_at,
          events (
            title
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)]">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4">
        <button
          onClick={() => navigate({ to: "/checkin" })}
          aria-label="Voltar"
          className="-ml-2 p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-heading-3 font-bold text-[var(--text-primary)]">Histórico Real</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="flex flex-col border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          {isLoading ? (
            <div className="px-4 py-12 text-center text-small text-[var(--text-secondary)]">
              Carregando histórico...
            </div>
          ) : (
            logs.map((item, idx) => {
              const date = new Date(item.created_at);
              const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const status = item.result === "sucesso" ? "valid" : item.result === "duplicidade" ? "already_used" : "invalid";
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    idx !== logs.length - 1 && "border-b border-[var(--border-subtle)]",
                  )}
                >
                  <div
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      status === "valid"
                        ? "bg-[var(--accent)]"
                        : status === "already_used"
                          ? "bg-[var(--warning)]"
                          : "bg-[var(--error)]",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-body font-medium text-[var(--text-primary)]">
                        {item.participant_name || item.ticket_code}
                      </p>
                    </div>
                    <p className="truncate text-small text-[var(--text-secondary)]">
                      {(item.events as any)?.title || "Evento não identificado"}
                    </p>
                  </div>
                  <span className="shrink-0 text-small text-[var(--text-secondary)]">{time}</span>
                </div>
              );
            })
          )}
          {!isLoading && logs.length === 0 && (
            <p className="px-4 py-8 text-center text-small text-[var(--text-secondary)]">
              Nenhuma tentativa de check-in registrada no banco.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
