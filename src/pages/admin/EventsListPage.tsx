import { useState } from "react";
import { Calendar, MapPin, ChevronLeft, ChevronRight, ExternalLink, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { ListPageHeader, PrimaryActionLink } from "@/components/admin/PrimaryActionButton";
import { FilterTabs } from "@/components/admin/FilterBar";
import { useEvents, eventStatusLabel, formatEventDate } from "@/lib/events-queries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const FILTER_MAP: Record<string, string> = {
  Publicados: "Publicado",
  Rascunhos: "Rascunho",
  Encerrados: "Encerrado",
};

export function EventsListPage() {
  const [filter, setFilter] = useState("Todos");
  const [pageSize, setPageSize] = useState(25);
  const { data: events = [], isLoading, error } = useEvents();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredEvents = events.filter((event) => {
    if (filter === "Todos") return true;
    return eventStatusLabel(event) === FILTER_MAP[filter];
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ListPageHeader
        title="Eventos"
        action={<PrimaryActionLink to="/admin/eventos/novo">Novo Evento</PrimaryActionLink>}
      />

      {/* Tabs Filter */}
      <FilterTabs
        tabs={["Todos", "Publicados", "Rascunhos", "Encerrados"]}
        value={filter}
        onChange={setFilter}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <div className="text-small text-text-secondary">Carregando eventos...</div>
        )}
        {error && (
          <div className="text-small text-error">Não foi possível carregar os eventos.</div>
        )}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="text-small text-text-secondary">Nenhum evento encontrado.</div>
        )}
        {filteredEvents.map((event) => {
          const { date, time } = formatEventDate(event.event_date);
          const status = eventStatusLabel(event);
          const capacity = event.capacity || 0;
          const progress = capacity > 0 ? Math.round((event.sold / capacity) * 100) : 0;
          return (
          <Link 
            key={event.id}
            to="/admin/eventos/$id"
            params={{ id: event.id }}
            className="group bg-bg-secondary border border-border-subtle overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col rounded-[var(--radius-md)]"
          >
            <div className="h-[140px] w-full relative">
              <img 
                src={event.image_url ?? "/placeholder.svg"} 
                alt={event.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className={cn(
                "absolute top-3 left-3 text-micro px-2 py-0.5 font-bold uppercase",
                status === "Publicado" && "bg-success text-[#111111]",
                status === "Rascunho" && "bg-bg-tertiary text-text-primary",
                status === "Encerrado" && "bg-error/20 text-error border border-error/20 backdrop-blur-sm",
              )}>
                {status}
              </div>
              <div className="absolute top-3 right-3 flex gap-2">
                {status === "Publicado" ? (
                  <a 
                    href={`/e/${event.slug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-bg-secondary p-1.5 border border-border-default shadow-sm text-text-secondary hover:text-accent transition-colors rounded-[var(--radius-sm)]"
                    title="Abrir página pública"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <div 
                    className="bg-bg-secondary p-1.5 border border-border-default shadow-sm text-text-disabled cursor-not-allowed opacity-60 rounded-[var(--radius-sm)]"
                    title="Publique o evento para gerar o link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 flex flex-col flex-1 gap-3">
              <h2 className="text-heading-2 text-text-primary group-hover:text-accent transition-colors truncate pr-16">{event.title}</h2>
              
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate({ to: "/admin/eventos/$id", params: { id: event.id } });
                  }}
                  className="bg-bg-secondary p-2 border border-border-default shadow-sm text-text-secondary hover:text-accent transition-colors rounded-[var(--radius-sm)]"
                  title="Editar evento"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={isDeleting === event.id}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!window.confirm(`Tem certeza que deseja excluir o evento "${event.title}"?`)) return;
                    setIsDeleting(event.id);
                    try {
                      const { error } = await supabase.rpc("delete_event", {
                        _event_id: event.id
                      });
                      if (error) throw error;
                      toast.success("Evento excluído com sucesso");
                      queryClient.invalidateQueries({ queryKey: ["events"] });
                    } catch (err: any) {
                      toast.error("Erro ao excluir: " + (err.message || "Verifique se há vendas pagas vinculadas."));
                    } finally {
                      setIsDeleting(null);
                    }
                  }}
                  className="bg-bg-secondary p-2 border border-border-default shadow-sm text-text-secondary hover:text-error transition-colors rounded-[var(--radius-sm)] disabled:opacity-50"
                  title="Excluir evento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-small text-text-secondary">
                  <Calendar className="w-4 h-4 text-accent" />
                  {date} às {time}
                </div>
                <div className="flex items-center gap-2 text-small text-text-secondary">
                  <MapPin className="w-4 h-4 text-accent" />
                  {event.location}
                </div>
              </div>

              <div className="mt-auto pt-2">
                <div className="flex items-center justify-between text-small text-text-secondary mb-1.5">
                  <span>{event.sold}/{capacity} vendidos</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-bg-tertiary overflow-hidden rounded-[var(--radius-full)]">
                  <div 
                    className="h-full bg-accent transition-all duration-500" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            </div>
          </Link>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-4 text-small text-text-secondary">
          <div className="flex items-center gap-2">
            Mostrar
            <select 
              value={pageSize} 
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-bg-secondary border border-border-default px-2 py-1 outline-none focus:border-accent rounded-[var(--radius-sm)]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <span>Mostrando 1–{filteredEvents.length} de {filteredEvents.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <button disabled className="p-2 border border-border-default text-text-disabled cursor-not-allowed rounded-[var(--radius-sm)]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-2 border border-border-default text-text-primary hover:border-accent transition-colors rounded-[var(--radius-sm)]">
            1
          </button>
          <button disabled className="p-2 border border-border-default text-text-disabled cursor-not-allowed rounded-[var(--radius-sm)]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
