import { createFileRoute } from '@tanstack/react-router';
import { useOrgActiveEvents } from "@/lib/customer-queries";
import { Loader2, Calendar, MapPin, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute('/cliente/eventos')({
  component: Page_cliente_eventos,
});

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getPriceRange(batches: { price: number; is_courtesy: boolean }[] | null | undefined) {
  const prices = (batches || [])
    .filter((b) => !b.is_courtesy && typeof b.price === "number")
    .map((b) => b.price);
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

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
          events.map((event: any) => {
            const range = getPriceRange(event.ticket_batches);
            return (
            <Link 
              key={event.id} 
              to="/e/$slug" 
              params={{ slug: event.slug }}
              className="rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] overflow-hidden flex flex-col active:scale-[0.98] transition-transform"
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
                  {range ? (
                    <div className="min-w-0">
                      <p className="text-micro uppercase tracking-wide text-[var(--text-disabled)]">Faixa de Preço</p>
                      <p className="text-body font-bold text-[var(--text-primary)]">
                        {range.min === range.max
                          ? formatCurrency(range.min)
                          : `${formatCurrency(range.min)} - ${formatCurrency(range.max)}`}
                      </p>
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
