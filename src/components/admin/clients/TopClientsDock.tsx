import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { TOP_CLIENTS, getInitials } from "@/lib/clients-data";

export function TopClientsDock({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <aside className="relative w-10 shrink-0 rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary shadow-[var(--shadow-sm)] transition-all duration-300">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expandir ranking Top 10 Clientes"
          className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[var(--radius-full)] text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex h-full items-start justify-center pt-4">
          <Trophy className="h-4 w-4 text-text-disabled" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary p-5 shadow-[var(--shadow-sm)] transition-all duration-300">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-heading-2 text-text-primary">Top 10 Clientes</h2>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Colapsar ranking"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-full)] text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <ul>
        {TOP_CLIENTS.map((client, index) => {
          const position = index + 1;
          return (
            <li key={client.id} className="border-b border-border-subtle last:border-0">
              <Link
                to="/admin/clientes/$id"
                params={{ id: client.id }}
                className="flex items-center justify-between gap-3 py-2 transition-colors hover:text-accent-text"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "w-6 shrink-0 text-center text-small tabular-nums",
                      position === 1 && "font-semibold text-accent-text",
                      (position === 2 || position === 3) &&
                        "rounded-[var(--radius-full)] bg-accent-muted py-0.5 font-medium text-accent-text",
                      position > 3 && "text-text-secondary",
                    )}
                  >
                    {position}
                  </span>
                  {client.avatarUrl ? (
                    <img
                      src={client.avatarUrl}
                      alt={client.name}
                      className="h-7 w-7 shrink-0 rounded-[var(--radius-full)] object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-bg-tertiary text-micro text-text-primary">
                      {getInitials(client.name)}
                    </span>
                  )}
                  <span className="truncate text-small text-text-primary">{client.name}</span>
                </span>
                <span className="shrink-0 text-right text-micro text-text-secondary">
                  {client.totalTickets} ingressos
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
