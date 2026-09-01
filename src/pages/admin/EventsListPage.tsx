import { useState } from "react";
import { Calendar, MapPin, ExternalLink, Edit2, Trash2, CalendarPlus, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ListPageHeader, PrimaryActionLink } from "@/components/admin/PrimaryActionButton";
import { useEvents, eventStatusLabel, formatEventDate } from "@/lib/events-queries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  Publicado: { bg: "bg-[var(--accent-muted)]", text: "text-[var(--accent-text)]", dot: "bg-[var(--accent)]" },
  Rascunho: { bg: "bg-[var(--warning-muted)]", text: "text-[var(--warning-text)]", dot: "bg-[var(--warning)]" },
  Encerrado: { bg: "bg-[var(--bg-tertiary)]", text: "text-[var(--text-secondary)]", dot: "bg-[var(--text-disabled)]" },
  Cancelado: { bg: "bg-[var(--error-muted)]", text: "text-[var(--error)]", dot: "bg-[var(--error)]" },
};

export function EventsListPage() {
  const [pageSize, setPageSize] = useState(25);
  const { data: events = [], isLoading, error } = useEvents();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ListPageHeader
        title="Eventos"
        action={<PrimaryActionLink to="/admin/eventos/novo">Novo Evento</PrimaryActionLink>}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-small text-[var(--text-secondary)]">Carregando eventos...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--error-muted)] flex items-center justify-center">
              <CalendarPlus className="w-6 h-6 text-[var(--error)]" />
            </div>
            <p className="text-body text-[var(--error)]">Não foi possível carregar os eventos.</p>
            <p className="text-small text-[var(--text-secondary)]">Tente novamente em alguns instantes.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && events.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
              <CalendarPlus className="w-8 h-8 text-[var(--text-disabled)]" />
            </div>
            <p className="text-body text-[var(--text-primary)]">Nenhum evento encontrado</p>
            <p className="text-small text-[var(--text-secondary)]">Comece criando seu primeiro evento</p>
          </div>
        </div>
      )}

      {!isLoading && !error && events.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => {
              const { date, time } = formatEventDate(event.event_date);
              const status = eventStatusLabel(event);
              const capacity = event.capacity || 0;
              const progress = capacity > 0 ? Math.round((event.sold / capacity) * 100) : 0;
              const statusStyle = statusStyles[status] ?? statusStyles["Encerrado"];
              const isPublished = status === "Publicado";
              const isClosed = status === "Encerrado";

              return (
                <div
                  key={event.id}
                  className="group bg-[var(--bg-primary)] border border-border-subtle overflow-hidden rounded-[var(--radius-lg)] shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  <div className="relative h-[160px] overflow-hidden">
                    <img
                      src={event.image_url ?? "/placeholder.svg"}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className={cn(
                      "absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-medium backdrop-blur-sm",
                      statusStyle.bg,
                      statusStyle.text,
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                      {status}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <TooltipProvider>
                        {isPublished ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={`/e/${event.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-[var(--bg-primary)]/90 backdrop-blur-sm border border-border-default rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>Abrir página pública</p></TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-2 bg-[var(--bg-primary)]/90 backdrop-blur-sm border border-border-default rounded-[var(--radius-sm)] text-[var(--text-disabled)] cursor-not-allowed">
                                <ExternalLink className="w-4 h-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>Publique o evento para gerar o link</p></TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate({ to: "/admin/eventos/$id", params: { id: event.id } })}
                              className="p-2 bg-[var(--bg-primary)]/90 backdrop-blur-sm border border-border-default rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-primary)] transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Editar evento</p></TooltipContent>
                        </Tooltip>

                        {!isClosed && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isClosing === event.id}
                                onClick={async () => {
                                  if (!window.confirm(`Encerrar o evento "${event.title}"? Os dados serão preservados para o futuro Histórico de Eventos.`)) return;
                                  setIsClosing(event.id);
                                  try {
                                    const { error } = await supabase
                                      .from("events")
                                      .update({ is_closed: true })
                                      .eq("id", event.id);
                                    if (error) throw error;
                                    toast.success("Evento encerrado e preparado para o Histórico de Eventos");
                                    await queryClient.invalidateQueries({ queryKey: ["events"] });
                                    await queryClient.invalidateQueries({ queryKey: ["events", event.id] });
                                  } catch (err: any) {
                                    toast.error("Erro ao encerrar evento: " + (err.message || "Tente novamente."));
                                  } finally {
                                    setIsClosing(null);
                                  }
                                }}
                                className="p-2 bg-[var(--bg-primary)]/90 backdrop-blur-sm border border-border-default rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-50"
                              >
                                {isClosing === event.id ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Archive className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>Encerrar evento e preparar para o histórico</p></TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isDeleting === event.id}
                              onClick={async () => {
                                if (!window.confirm(`Tem certeza que deseja excluir o evento "${event.title}"?`)) return;
                                setIsDeleting(event.id);
                                try {
                                  const { error } = await supabase.rpc("delete_event", { _event_id: event.id });
                                  if (error) throw error;
                                  toast.success("Evento excluído com sucesso");
                                  queryClient.invalidateQueries({ queryKey: ["events"] });
                                } catch (err: any) {
                                  toast.error("Erro ao excluir: " + (err.message || "Verifique se há vendas pagas vinculadas."));
                                } finally {
                                  setIsDeleting(null);
                                }
                              }}
                              className="p-2 bg-[var(--bg-primary)]/90 backdrop-blur-sm border border-border-default rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-50"
                            >
                              {isDeleting === event.id ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Excluir evento</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1 gap-4">
                    <div>
                      <h2 className="text-heading-2 text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                        {event.title}
                      </h2>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
                        <Calendar className="w-4 h-4 text-[var(--text-disabled)]" />
                        <span>{date} • {time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
                        <MapPin className="w-4 h-4 text-[var(--text-disabled)]" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                    <div className="mt-auto pt-2">
                      <div className="flex items-center justify-between text-micro text-[var(--text-secondary)] mb-2">
                        <span>{event.sold} de {capacity} ingressos</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border-subtle">
            <div className="flex items-center gap-4 text-small text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <span>Mostrar</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-[var(--bg-secondary)] border border-border-default px-2.5 py-1.5 text-small outline-none focus:border-[var(--accent)] rounded-[var(--radius-sm)] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Mostrando 1–{events.length} de {events.length}</span>
            </div>

            <div className="flex items-center gap-1">
              <button disabled className="p-2 border border-border-default text-[var(--text-disabled)] cursor-not-allowed rounded-[var(--radius-sm)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button className="px-3 py-1.5 border border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)] text-small font-medium rounded-[var(--radius-sm)]">1</button>
              <button disabled className="p-2 border border-border-default text-[var(--text-disabled)] cursor-not-allowed rounded-[var(--radius-sm)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
