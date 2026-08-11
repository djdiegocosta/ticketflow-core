import { useState } from 'react';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Minus, Plus } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

// Mock data
const EVENT = {
  id: 'e1',
  name: 'Festa de Verão',
  slug: 'festa-de-verao',
  date: 'Sábado, 20 de Dezembro • 22:00',
  location: 'Arena Praia, Guarujá',
  description: 'A melhor festa do verão chega ao Guarujá com open bar premium, atrações nacionais e uma estrutura nunca antes vista na praia. Prepare-se para uma noite inesquecível com pé na areia e o melhor do House Music e Open Format.',
  coverImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=1200',
  batches: [
    { id: 'b1', name: 'Lote 01 - Promo', price: 120, status: 'disponivel', stock: 5 },
    { id: 'b2', name: 'Lote 02', price: 150, status: 'disponivel', stock: 50 }
  ]
};

export default function EventPage() {
  const [selectedBatchId, setSelectedBatchId] = useState(EVENT.batches[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();

  const selectedBatch = EVENT.batches.find(b => b.id === selectedBatchId) || EVENT.batches[0];
  const totalPrice = (selectedBatch?.price || 0) * quantity;

  const handleBuy = () => {
    if (!selectedBatchId) return;
    navigate({ 
      to: `/e/${EVENT.slug}/checkout`,
      search: { batchId: selectedBatchId, qty: quantity }
    });
  };

  return (
    <MobileLayout>
      <div className="flex flex-col animate-in fade-in duration-500">
        {/* Cover Image */}
        <div className="relative h-64 w-full">
          <img 
            src={EVENT.coverImage} 
            alt={EVENT.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] to-transparent opacity-60" />
        </div>

        {/* Content */}
        <div className="relative -mt-8 flex flex-col gap-6 rounded-t-3xl bg-[var(--bg-primary)] px-5 pt-8 pb-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-display font-bold leading-tight text-[var(--text-primary)]">
              {EVENT.name}
            </h1>
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
                <span>{EVENT.date}</span>
              </div>
              <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
                <MapPin className="h-4 w-4 text-[var(--accent)]" />
                <span>{EVENT.location}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-heading-3 font-semibold text-[var(--text-primary)]">Sobre o evento</h3>
            <p className="text-body text-[var(--text-secondary)] leading-relaxed">
              {EVENT.description}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-heading-3 font-semibold text-[var(--text-primary)]">Selecione o ingresso</h3>
            <div className="flex flex-col gap-3">
              {EVENT.batches.map((batch) => (
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
      <div className="fixed bottom-16 left-0 right-0 z-50 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-5 py-4 safe-area-bottom shadow-lg">
        <Button
          onClick={handleBuy}
          className="h-14 w-full bg-[var(--accent)] text-[#111111] font-bold text-lg hover:bg-[var(--accent-hover)] transition-all active:scale-[0.98]"
        >
          <span>Comprar agora • R$ {totalPrice.toFixed(2)}</span>
        </Button>
      </div>
    </MobileLayout>
  );
}
