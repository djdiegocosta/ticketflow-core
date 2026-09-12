import { createFileRoute } from '@tanstack/react-router';
import { useOrgActiveEvents } from "@/lib/customer-queries";
import { Loader2, Calendar, MapPin, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute('/cliente/eventos')({
  component: Page_cliente_eventos,
});

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getCurrentBatches(
  batches:
    | { id: string; name: string; price: number; is_courtesy: boolean; starts_at: string; ends_at: string }[]
    | null
    | undefined,
  now: number,
) {
  return (batches || []).filter((batch) => {
    if (batch.is_courtesy || typeof batch.price !== "number") return false;

    const startsAt = new Date(batch.starts_at).getTime();
    const endsAt = new Date(batch.ends_at).getTime();

    return startsAt <= now && now < endsAt;
  });
}

export function Page_cliente_eventos() {
  const { data: events = [], isLoading } = useOrgActiveEvents();
  const [now, setNow] = useState(() => Date.now());

  // Mantém a exibição sincronizada com a virada automática de lote
  // enquanto a tela permanecer aberta.
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

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
          events.map((event: any) => {
            const currentBatches = getCurrentBatches(event.ticket_batches, now);
            return (
            <Link 
              key={event.id} 
              to="/e/$slug" 
              params={{ slug: event.slug }}
              className="rounded-[var(--radius-md)] bg-[var(--bg-secondary)] overflow-hidden flex flex-col active:scale-[0.98] transition-transform"
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
              <div className="p-4 space-y-3">
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

                <div className="flex items-end justify-between gap-3 pt-1">
                  {currentBatches.length > 0 ? (
                    <div className="min-w-0 flex-1">
                      <p className="text-micro uppercase tracking-wide text-[var(--text-disabled)]">Valor do lote atual:</p>
                      <div className={currentBatches.length > 1 ? "grid grid-cols-2 gap-3 mt-1" : "mt-1"}>
                        {currentBatches.map((batch) => (
                          <div key={batch.id} className="min-w-0">
                            {currentBatches.length > 1 && (
                              <p className="text-micro font-medium text-[var(--text-secondary)] truncate">
                                {batch.name}
                              </p>
                            )}
                            <p className="text-body font-bold text-[var(--text-primary)]">
                              {formatCurrency(batch.price)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <span />}

                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[#111111]">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          );})
        ) : (
          <div className="rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]/30 border border-dashed border-[var(--border-subtle)] p-12 text-center">
            <p className="text-small text-[var(--text-secondary)]">Nenhum evento ativo no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
