import { MobileLayout } from '@/components/layouts/MobileLayout';
import { Button } from '@/components/ui/button';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { Calendar, MapPin, User, ChevronLeft, Share2, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/components/ui/badge';
import { useTicketByCode } from '@/lib/customer-queries';

export default function TicketDetailPage() {
  const { ticket_code } = useParams({ from: '/ingresso/$ticket_code' });
  const { data: ticket, isLoading, error } = useTicketByCode(ticket_code);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <MobileLayout showFooter={false}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !ticket) {
    return (
      <MobileLayout showFooter={false}>
        <div className="flex flex-col items-center justify-center gap-4 px-5 py-20 text-center">
          <h2 className="text-heading-2 font-bold text-[var(--text-primary)]">Ingresso não encontrado</h2>
          <p className="text-small text-[var(--text-secondary)]">O código do ingresso é inválido.</p>
          <Button onClick={() => navigate({ to: '/meus-ingressos' })} className="bg-[var(--accent)] text-[#111111]">
            Buscar outro
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Válido': return 'success';
      case 'Utilizado': return 'warning';
      case 'Cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  const eventData = (ticket.sales as any)?.events;

  return (
    <MobileLayout 
      showFooter={false}
      headerContent={
        <div className="flex items-center justify-between w-full">
          <Link to="/meus-ingressos" className="p-2 -ml-2 text-[var(--text-secondary)]">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="text-center font-semibold text-small">Visualizar Ingresso</div>
          <button className="p-2 -mr-2 text-[var(--text-secondary)]">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 px-5 py-8 animate-in fade-in duration-500">
        
        {/* Ticket Branding Header */}
        <div className="flex flex-col items-center gap-2 text-center mb-2">
          <h1 className="text-display font-bold leading-tight text-[var(--text-primary)] text-center">
            {eventData?.title || "Evento"}
          </h1>
          <Badge variant={getStatusVariant(ticket.status) as any} className="mt-1">
            {ticket.status}
          </Badge>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center gap-6 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 shadow-xl">
          <div className="bg-white p-5 rounded-2xl shadow-sm ring-8 ring-[var(--bg-primary)]">
            <QRCodeSVG value={ticket.ticket_code} size={220} />
          </div>
          
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-small font-mono font-bold text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-3 py-1 rounded">
              {ticket.ticket_code}
            </span>
            <span className="text-xs text-[var(--text-secondary)] mt-1">Apresente este código na entrada</span>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
          <div className="flex flex-col gap-5">
            <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-text)]">
                <User className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider">Participante</span>
                <span className="text-body font-bold text-[var(--text-primary)]">{ticket.participant_name}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider">Data do Evento</span>
                <span className="text-body font-bold text-[var(--text-primary)]">
                  {eventData?.event_date ? new Date(eventData.event_date).toLocaleString('pt-BR') : '—'}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider">Local</span>
                <span className="text-body font-bold text-[var(--text-primary)]">{eventData?.location || "Local não informado"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)]/30 p-4 border border-[var(--border-subtle)] border-dashed">
          <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Instruções</h4>
          <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc pl-4">
            <li>Chegue com antecedência ao local do evento.</li>
            <li>Tenha seu documento original com foto em mãos.</li>
            <li>Aumente o brilho da tela do celular para facilitar a leitura.</li>
          </ul>
        </div>
      </div>
    </MobileLayout>
  );
}
