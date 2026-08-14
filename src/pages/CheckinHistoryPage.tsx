import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCheckinAttempts } from "@/lib/checkin-data";

export function CheckinHistoryPage() {
  const navigate = useNavigate();
  const attempts = useCheckinAttempts();

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
        <h1 className="text-heading-3 font-bold text-[var(--text-primary)]">Histórico</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="flex flex-col border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          {attempts.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                idx !== attempts.length - 1 && "border-b border-[var(--border-subtle)]",
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  item.status === "valid"
                    ? "bg-[var(--accent)]"
                    : item.status === "already_used"
                      ? "bg-[var(--warning)]"
                      : "bg-[var(--error)]",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-[var(--text-primary)]">{item.name}</p>
                <p className="truncate text-small text-[var(--text-secondary)]">{item.eventName}</p>
              </div>
              <span className="shrink-0 text-small text-[var(--text-secondary)]">{item.time}</span>
            </div>
          ))}
          {attempts.length === 0 && (
            <p className="px-4 py-8 text-center text-small text-[var(--text-secondary)]">
              Nenhuma tentativa de check-in registrada.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
