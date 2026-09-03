import { useState, useMemo, useEffect } from 'react';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Minus, Plus, Loader2 } from 'lucide-react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { usePublicEvent, useApplyPublicDesign, useAvailableBatches } from '@/lib/customer-queries';
import { setLastVisitedOrg } from '@/lib/org-context';
import { captureRef } from '@/lib/attribution';

export default function EventPage() {
  const { slug } = useParams({ from: '/e/$slug/' });
  const search = useSearch({ from: '/e/$slug/' }) as { ref?: string };
  const { data: event, isLoading, error } = usePublicEvent(slug);
  const { data: availableBatches } = useAvailableBatches(event?.id);
  useApplyPublicDesign(slug);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();

  // Seleciona o primeiro lote por padrão quando carregar
  useMemo(() => {
    if (availableBatches && availableBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(availableBatches[0]?.id || null);
    }
  }, [availableBatches, selectedBatchId]);

  useEffect(() => {
    if (event?.id) captureRef(event.id, search.ref);
  }, [event?.id, search.ref]);

  useEffect(() => {
    if (event?.organization_id) {
      setLastVisitedOrg(event.organization_id);
    }
  }, [event?.organization_id]);

  if (isLoading) {
    return (
      <MobileLayout showFooter={false}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !event) {
    return (
      <MobileLayout showFooter={false}>
        <div className="flex flex-col items-center justify-center gap-4 px-5 py-20 text-center">
          <h2 className="text-heading-2 font-bold text-[var(--text-primary)]">Evento não encontrado</h2>
          <p className="text-small text-[var(--text-secondary)]">Este evento não existe ou não está mais disponível.</p>
          <Button onClick={() => navigate({ to: '/' })} className="bg-[var(--accent)] text-[#111111]">
            Voltar ao início
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const selectedBatch = availableBatches?.find(b => b.id === selectedBatchId) || availableBatches?.[0];
  const totalPrice = (selectedBatch?.price || 0) * quantity;

  const handleBuy = () => {
    if (!selectedBatchId) return;
    navigate({ 
      to: `/e/${event.slug}/checkout`,
      search: { batchId: selectedBatchId, qty: String(quantity) }
    });
  };

  return (
    <MobileLayout showFooter={false}>
      <div className="flex flex-col animate-in fade-in duration-500">
        {/* Cover Image */}
        <div className="relative h-64 w-full bg-[var(--bg-tertiary)]">
          {event.image_url ? (
            <img 
              src={event.image_url} 
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-disabled)]">
              Sem imagem
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] to-transparent opacity-60" />
        </div>

        {/* Content */}
        <div className="relative -mt-8 flex flex-col gap-6 rounded-t-3xl bg-[var(--bg-primary)] px-5 pt-8 pb-32 safe-area-bottom">
          <div className="flex flex-col gap-2">
            <h1 className="text-display font-bold leading-tight text-[var(--text-primary)]">
              {event.title}
            </h1>
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
                <span>{new Date(event.event_date).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}</span>
              </div>
              <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
                <MapPin className="h-4 w-4 text-[var(--accent)]" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-heading-3 font-semibold text-[var(--text-primary)]">Sobre o evento</h3>
            <p className="text-body text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
              {event.description || "Nenhuma descrição informada."}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-heading-3 font-semibold text-[var(--text-primary)]">Selecione o ingresso</h3>
            <div className="flex flex-col gap-3">
              {availableBatches?.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`flex items-center justify-between rounded-[var(--radius-md)] border-2 p-4 transition-all ${
                    selectedBatchId === batch.id
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-[var(--text-primary)]">{batch.name}</span>
                    <span className="text-small text-[var(--text-secondary)]">R$ {batch.price.toFixed(2)}</span>
                  </div>
                  {selectedBatchId === batch.id && (
                    <div className="h-5 w-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-[#111111]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <h3 className="text-heading-3 font-semibold text-[var(--text-primary)]">Quantidade</h3>
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-10 w-10 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <Minus className="h-5 w-5" />
              </Button>
              <span className="text-heading-2 font-bold text-[var(--text-primary)]">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                className="h-10 w-10 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer Buy Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-5 py-4 safe-area-bottom shadow-lg">
        <Button
          onClick={handleBuy}
          disabled={!selectedBatchId}
          className="h-14 w-full bg-[var(--accent)] text-[#111111] font-bold text-lg hover:bg-[var(--accent-hover)] transition-all active:scale-[0.98]"
        >
          <span>Comprar agora • R$ {totalPrice.toFixed(2)}</span>
        </Button>
      </div>
    </MobileLayout>
  );
}
