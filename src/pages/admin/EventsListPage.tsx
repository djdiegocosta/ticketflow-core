import { useState } from "react";
import { Calendar, MapPin, ExternalLink, Edit2, Trash2, CalendarPlus, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { PrimaryActionLink } from "@/components/admin/PrimaryActionButton";
import { useEvents, eventStatusLabel, formatEventDate } from "@/lib/events-queries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const renderCreateAction = () => <PrimaryActionLink to="/admin/eventos/novo">Novo Evento</PrimaryActionLink>;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
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
            <div className="pt-2">{renderCreateAction()}</div>
          </div>
        </div>
      )}

      {!isLoading && !error && events.length > 0 && (
        <>
          <div className="flex items-center justify-end">{renderCreateAction()}</div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const { date, time } = formatEventDate(event.event_date);
              const status = eventStatusLabel(event);
              const capacity = event.capacity || 0;
              const progress = capacity > 0 ? Math.round((event.sold / capacity) * 100) : 0;
              const statusStyle = statusStyles[status] ?? statusStyles.Encerrado;
              const isPublished = status === "Publicado";
              const isClosed = status === "Encerrado";

              return (
                <div key={event.id} className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle bg-[var(--bg-primary)] shadow-sm transition-all duration-300 hover:shadow-lg">
                  <div className="relative h-[160px] overflow-hidden">
                    <img src={event.image_url ?? "/placeholder.svg"} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className={cn("absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-micro font-medium backdrop-blur-sm", statusStyle.bg, statusStyle.text)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusStyle.dot)} />
                      {status}
                    </div>

                    <div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <TooltipProvider>
                        {isPublished ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a href={`/e/${event.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-[var(--radius-sm)] border border-border-default bg-[var(--bg-primary)]/90 p-2 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:text-[var(--accent)]">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>Abrir página pública</p></TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-not-allowed rounded-[var(--radius-sm)] border border-border-default bg-[var(--bg-primary)]/90 p-2 text-[var(--text-disabled)] backdrop-blur-sm">
                                <ExternalLink className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>Publique o evento para gerar o link</p></TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/admin/eventos/$id", params: { id: event.id } })} className="rounded-[var(--radius-sm)] border border-border-default bg-[var(--bg-primary)]/90 p-2 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--accent)]">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Editar evento</p></TooltipContent>
                        </Tooltip>

                        {!isClosed && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isClosing === event.id} onClick={async () => {
                                if (!window.confirm(`Encerrar o evento "${event.title}"? Os dados serão preservados para o futuro Histórico de Eventos.`)) return;
                                setIsClosing(event.id);
                                try {
                                  const { error } = await supabase.from("events").update({ is_closed: true }).eq("id", event.id);
                                  if (error) throw error;
                                  toast.success("Evento encerrado e preparado para o Histórico de Eventos");
                                  await queryClient.invalidateQueries({ queryKey: ["events"] });
                                  await queryClient.invalidateQueries({ queryKey: ["events", event.id] });
                                } catch (err: any) {
                                  toast.error("Erro ao encerrar evento: " + (err.message || "Tente novamente."));
                                } finally {
                                  setIsClosing(null);
                                }
                              }} className="rounded-[var(--radius-sm)] border border-border-default bg-[var(--bg-primary)]/90 p-2 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--accent)] disabled:opacity-50">
                                {isClosing === event.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Archive className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom"><p>Encerrar evento e preparar para o histórico</p></TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isDeleting === event.id} onClick={async () => {
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
                            }} className="rounded-[var(--radius-sm)] border border-border-default bg-[var(--bg-primary)]/90 p-2 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--error)] disabled:opacity-50">
                              {isDeleting === event.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Excluir evento</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-4">
                    <h2 className="line-clamp-2 text-heading-2 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">{event.title}</h2>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]"><Calendar className="h-4 w-4 text-[var(--text-disabled)]" /><span>{date} • {time}</span></div>
                      <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]"><MapPin className="h-4 w-4 text-[var(--text-disabled)]" /><span className="truncate">{event.location}</span></div>
                    </div>
                    <div className="mt-auto pt-2">
                      <div className="mb-2 flex items-center justify-between text-micro text-[var(--text-secondary)]"><span>{event.sold} de {capacity} ingressos</span><span className="font-medium">{progress}%</span></div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]"><div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-4 sm:flex-row">
            <div className="flex items-center gap-4 text-small text-[var(--text-secondary)]">
              <div className="flex items-center gap-2"><span>Mostrar</span><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="cursor-pointer rounded-[var(--radius-sm)] border border-border-default bg-[var(--bg-secondary)] px-2.5 py-1.5 text-small outline-none focus:border-[var(--accent)]"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></div>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Mostrando 1–{events.length} de {events.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button disabled className="cursor-not-allowed rounded-[var(--radius-sm)] border border-border-default p-2 text-[var(--text-disabled)]"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
              <button className="rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--accent-muted)] px-3 py-1.5 text-small font-medium text-[var(--accent-text)]">1</button>
              <button disabled className="cursor-not-allowed rounded-[var(--radius-sm)] border border-border-default p-2 text-[var(--text-disabled)]"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
