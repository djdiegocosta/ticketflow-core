import { createFileRoute } from '@tanstack/react-router';
import { useOrgActiveEvents } from "@/lib/customer-queries";
import { Loader2, Calendar, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute('/cliente/eventos')({
  component: Page_cliente_eventos,
});

export function Page_cliente_eventos() {
  const { data: events = [], isLoading } = useOrgActiveEvents();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-1">Eventos</h1>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {events.length > 0 ? (
          events.map((event: any) => (
            <Link 
              key={event.id} 
              to="/e/$slug" 
              params={{ slug: event.slug }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] overflow-hidden rounded-none flex flex-col active:scale-[0.98] transition-transform"
            >
              <div className="aspect-video w-full bg-[var(--bg-tertiary)] overflow-hidden">
                {event.image_url ? (
                  <img 
                    src={event.image_url} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-disabled)]">
                    <Calendar className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-bold text-body line-clamp-2">{event.title}</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{new Date(event.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-[var(--bg-tertiary)]/30 border border-dashed border-[var(--border-subtle)] p-12 rounded-none text-center">
            <p className="text-small text-[var(--text-secondary)]">Nenhum evento ativo no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
