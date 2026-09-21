import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { formatCurrency } from "@/lib/sales-queries";
import { FilterBar, FilterSearch } from "@/components/admin/FilterBar";
import { StatusPill } from "@/components/admin/DataTable";
import { MOCK_EVENT_HISTORY_LIST } from "@/lib/mocks/historico-eventos.mock";

/**
 * Histórico de Eventos — Etapa visual (dados MOCK).
 * Ver /docs/HISTORICO-DE-EVENTOS.md para o status da ferramenta.
 */
export function EventHistoryListPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return MOCK_EVENT_HISTORY_LIST;
    return MOCK_EVENT_HISTORY_LIST.filter(
      (event) =>
        event.title.toLowerCase().includes(term) ||
        event.city.toLowerCase().includes(term) ||
        event.venue.toLowerCase().includes(term),
    );
  }, [search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-heading-1 text-text-primary">Histórico de Eventos</h1>
        <p className="mt-1 text-body text-text-secondary">
          Consulte os resultados e indicadores dos eventos realizados.
        </p>
      </div>

      <FilterBar>
        <FilterSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar por evento, local ou cidade"
        />
      </FilterBar>

      <div className="space-y-3">
        {filtered.map((event) => (
          <Link
            key={event.id}
            to="/admin/ferramentas/historico-eventos/$id"
            params={{ id: event.id }}
            className="group flex flex-col gap-4 bg-bg-secondary p-4 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] transition-colors hover:border-accent sm:flex-row sm:items-center border border-transparent"
          >
            <div
              className="h-16 w-16 shrink-0 bg-cover bg-center rounded-[var(--radius-sm)]"
              style={{ backgroundImage: `url(${event.coverImage})` }}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-heading-2 text-text-primary group-hover:text-accent-text transition-colors">
                  {event.title}
                </h2>
                <StatusPill tone="neutral">Encerrado</StatusPill>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.venue} · {event.city}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:shrink-0 sm:items-center sm:gap-8">
              <div>
                <p className="flex items-center gap-1 text-small text-text-secondary">
                  <Users className="h-3.5 w-3.5" /> Público
                </p>
                <p className="text-body font-semibold text-text-primary">{event.attendance}</p>
              </div>
              <div>
                <p className="text-small text-text-secondary">Ingressos</p>
                <p className="text-body font-semibold text-text-primary">{event.ticketsSold}</p>
              </div>
              <div>
                <p className="text-small text-text-secondary">Receita</p>
                <p className="text-body font-semibold text-text-primary">
                  {formatCurrency(event.revenue)}
                </p>
              </div>
              <div>
                <p className="text-small text-text-secondary">Resultado</p>
                <p
                  className={`text-body font-semibold ${
                    event.result >= 0 ? "text-accent-text" : "text-error-text"
                  }`}
                >
                  {formatCurrency(event.result)}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="bg-bg-secondary p-10 text-center text-body text-text-secondary shadow-[var(--shadow-sm)] rounded-[var(--radius-md)]">
            Nenhum evento encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
