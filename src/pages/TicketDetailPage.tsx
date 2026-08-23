import { MobileLayout } from '@/components/layouts/MobileLayout';
import { Button } from '@/components/ui/button';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { Calendar, MapPin, User, ChevronLeft, Share2, Loader2, Ticket } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTicketByCode, ticketStatusMeta } from '@/lib/customer-queries';
import { StatusPill } from '@/components/admin/DataTable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        
        {/* Ticket Boarding Pass Card */}
        <div className="rounded-[var(--radius-xl)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-xl overflow-hidden relative">
          {/* Status Pill */}
          <div className="absolute top-4 right-4 z-20">
            <StatusPill tone={ticketStatusMeta(ticket.status).tone}>
              {ticketStatusMeta(ticket.status).label}
            </StatusPill>
          </div>

          {/* Top of Card */}
          <div className="pt-5 px-6 pb-6">
            <div className="text-xs uppercase tracking-wider text-center text-[var(--text-secondary)] mb-2">
              {eventData?.organizations?.name || "Produtora"}
            </div>

            {/* Grid Date and Time */}
            <div className="grid grid-cols-2 border-y border-[var(--border-subtle)] py-4 my-3">
              <div className="border-r border-[var(--border-subtle)] px-2 text-center">
                <div className="text-[10px] uppercase text-[var(--text-secondary)] font-semibold tracking-wide">Data</div>
                <div className="font-bold text-body">
                  {eventData?.event_date ? format(new Date(eventData.event_date), 'dd/MM/yyyy') : '—'}
                </div>
              </div>
              <div className="px-2 text-center">
                <div className="text-[10px] uppercase text-[var(--text-secondary)] font-semibold tracking-wide">Horário</div>
                <div className="font-bold text-body">
                  {eventData?.event_date ? format(new Date(eventData.event_date), 'HH:mm') : '—'}
                </div>
              </div>
            </div>

            <h1 className="text-heading-1 font-bold text-center mt-3 text-[var(--text-primary)] leading-tight">
              {eventData?.title || "Evento"}
            </h1>
            
            <div className="text-small text-[var(--text-secondary)] text-center mt-2 flex items-center justify-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{eventData?.location || "Local não informado"}</span>
            </div>
          </div>

          {/* Perforation Line */}
          <div className="border-t-2 border-dashed border-[var(--border-default)] -mx-6 relative">
            {/* Outline Balls */}
            <div className="w-6 h-6 rounded-full bg-[var(--bg-primary)] absolute left-[-12px] top-[-12px]" />
            <div className="w-6 h-6 rounded-full bg-[var(--bg-primary)] absolute right-[-12px] top-[-12px]" />
            
            {/* Circular Seal */}
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-md absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <Ticket className="h-4 w-4 text-[#111111]" />
            </div>
          </div>

          {/* QR Code Section */}
          <div className="pt-5 px-6 pb-0">
            <div className="text-center uppercase text-[10px] font-semibold tracking-widest text-[var(--text-secondary)] mb-4">
              Apresente este código na entrada do evento
            </div>
            
            <div className="flex justify-center pt-2 relative z-0">
              <div className="p-4 rounded-2xl ring-4 ring-[var(--bg-primary)] bg-white">
                <QRCodeSVG value={ticket.ticket_code} size={200} />
              </div>
            </div>
          </div>

          {/* Colored Bottom Strip */}
          <div className="bg-[var(--accent)] px-6 pb-5 -mt-16 pt-24 text-[#111111]">
            <div className="flex justify-center mb-4">
              <span className="font-mono bg-black/10 text-[#111111] rounded px-2.5 py-1 text-small font-bold">
                {ticket.ticket_code}
              </span>
            </div>

            <div className="text-[10px] text-[#111111]/65 text-center font-medium">
              Comprado em {ticket.sales?.created_at ? format(new Date(ticket.sales.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 mt-4 border-t border-black/5 pt-4">
              <div>
                <div className="text-[10px] uppercase text-[#111111]/60 font-bold tracking-tighter">Participante</div>
                <div className="font-bold text-xs truncate">{ticket.participant_name}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-[#111111]/60 font-bold tracking-tighter">Lote</div>
                <div className="font-bold text-xs truncate">{(ticket.ticket_batches as any)?.name || "Geral"}</div>
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
