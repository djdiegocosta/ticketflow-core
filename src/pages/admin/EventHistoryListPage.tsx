import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { formatCurrency } from "@/lib/sales-queries";
import { FilterBar, FilterSearch } from "@/components/admin/FilterBar";
import { StatusPill } from "@/components/admin/DataTable";
import { useEventHistoryList } from "@/lib/event-history-queries";

export function EventHistoryListPage() {
  const [search, setSearch] = useState("");
  const { data: events = [], isLoading, error } = useEventHistoryList();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return events;

    return events.filter(({ snapshot }) =>
      [
        snapshot.event.title,
        snapshot.event.venue,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [events, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-heading-1 text-text-primary">Histórico de Eventos</h1>
        <p className="mt-1 text-body text-text-secondary">
          Consulte os resultados, indicadores e dados históricos dos eventos realizados.
        </p>
      </div>

      <FilterBar>
        <FilterSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar por evento, local ou cidade"
        />
      </FilterBar>

      {isLoading && (
        <div className="rounded-[var(--radius-md)] bg-bg-secondary p-10 text-center text-small text-text-secondary">
          Carregando histórico...
        </div>
      )}

      {error && (
        <div className="rounded-[var(--radius-md)] border border-error/30 bg-error-muted p-5 text-small text-error-text">
          Não foi possível carregar o Histórico de Eventos. Tente novamente em instantes.
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-[var(--radius-md)] bg-bg-secondary p-10 text-center">
          <p className="text-body font-medium text-text-primary">
            {search ? "Nenhum evento encontrado." : "Nenhum evento encerrado no histórico."}
          </p>
          <p className="mt-1 text-small text-text-secondary">
            {search
              ? "Tente outro nome de evento, local ou cidade."
              : "Depois de finalizar o encerramento de um evento, ele aparecerá aqui."}
          </p>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(({ id, snapshot }) => (
            <Link
              key={id}
              to="/admin/ferramentas/historico-eventos/$id"
              params={{ id }}
              className="group flex flex-col gap-4 rounded-[var(--radius-md)] border border-transparent bg-bg-secondary p-4 shadow-[var(--shadow-sm)] transition-colors hover:border-accent sm:flex-row sm:items-center"
            >
              <div
                className="h-16 w-16 shrink-0 rounded-[var(--radius-sm)] bg-cover bg-center"
                style={{
                  backgroundImage: snapshot.event.imageUrl
                    ? "url(" + snapshot.event.imageUrl + ")"
                    : undefined,
                }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-heading-2 text-text-primary transition-colors group-hover:text-accent-text">
                    {snapshot.event.title}
                  </h2>
                  <StatusPill tone="neutral">Encerrado</StatusPill>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(snapshot.event.date).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {snapshot.event.venue}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:shrink-0 sm:items-center sm:gap-8">
                <div>
                  <p className="flex items-center gap-1 text-small text-text-secondary">
                    <Users className="h-3.5 w-3.5" /> Público
                  </p>
                  <p className="text-body font-semibold text-text-primary">
                    {snapshot.audience.attendancePresent}
                  </p>
                </div>

                <div>
                  <p className="text-small text-text-secondary">Ingressos</p>
                  <p className="text-body font-semibold text-text-primary">
                    {snapshot.audience.paidTickets}
                  </p>
                </div>

                <div>
                  <p className="text-small text-text-secondary">Receita</p>
                  <p className="text-body font-semibold text-text-primary">
                    {formatCurrency(snapshot.finance.totalRevenue)}
                  </p>
                </div>

                <div>
                  <p className="text-small text-text-secondary">Resultado</p>
                  <p
                    className={
                      "text-body font-semibold " +
                      (snapshot.finance.netResult >= 0 ? "text-accent-text" : "text-error-text")
                    }
                  >
                    {formatCurrency(snapshot.finance.netResult)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
