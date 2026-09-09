import { MobileLayout } from '@/components/layouts/MobileLayout';
import { InstallAppButton } from '@/components/cliente/InstallAppButton';
import { Button } from '@/components/ui/button';
import { useParams, Link } from '@tanstack/react-router';
import { CheckCircle2, QrCode, Download, UserPlus, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useSaleByCode, useApplyPublicDesign } from '@/lib/customer-queries';
import { useState } from 'react';

export default function ConfirmationPage() {
  const { slug, sale_code } = useParams({ from: '/e/$slug/confirmacao/$sale_code' });
  const { data: sale, isLoading } = useSaleByCode(sale_code);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  useApplyPublicDesign(slug);

  const downloadAllTicketsPdf = async () => {
    if (!sale?.tickets?.length || isGeneratingPdf) return;

    setIsGeneratingPdf(true);

    try {
      const response = await fetch(`/api/public/tickets/pdf?sale_code=${encodeURIComponent(sale_code)}`);
      if (!response.ok) {
        throw new Error(`Falha ao gerar PDF (${response.status}).`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `ingressos-${sale_code}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao baixar PDF dos ingressos:', error);
      window.alert('Não foi possível gerar o PDF dos ingressos. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <MobileLayout showFooter={false}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        </div>
      </MobileLayout>
    );
  }

  if (!sale) {
    return (
      <MobileLayout showFooter={false}>
        <div className="flex flex-col items-center justify-center gap-4 px-5 py-20 text-center">
          <h2 className="text-heading-2 font-bold text-[var(--text-primary)]">Venda não encontrada</h2>
          <p className="text-small text-[var(--text-secondary)]">O código da venda é inválido ou ainda está sendo processado.</p>
          <Button asChild className="bg-[var(--accent)] text-[#111111]">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showFooter={false} headerContent={<div className="text-center font-semibold text-small">Sucesso!</div>}>
      <div className="flex flex-col gap-6 px-5 py-8 pb-32 safe-area-bottom animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-display font-bold text-[var(--text-primary)]">Compra Confirmada!</h2>
            <p className="text-small text-[var(--text-secondary)]">Pagamento recebido. Seus ingressos já estão disponíveis.</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--accent)] bg-[var(--accent-muted)] p-5">
          <h3 className="text-heading-3 font-bold text-[var(--text-primary)]">Guarde seu ingresso</h3>
          <div className="mt-3 space-y-2 text-small leading-5 text-[var(--text-primary)]">
            <p>• Baixe o PDF e mantenha o ingresso salvo no celular.</p>
            <p>• Apresente o QR Code do ingresso na entrada do evento.</p>
            <p>• Não envie, publique ou repasse seu ingresso para outra pessoa.</p>
            <p>• Cada ingresso é válido para um único acesso e será validado na entrada.</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] p-4">
          <h3 className="text-small font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Resumo</h3>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-body">
              <span className="text-[var(--text-secondary)]">Evento</span>
              <span className="font-semibold text-[var(--text-primary)] text-right">{(sale as any).event_title}</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-[var(--text-secondary)]">Data</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {(sale as any).event_date ? new Date((sale as any).event_date).toLocaleDateString('pt-BR') : '—'}
              </span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-[var(--text-secondary)]">Qtd. Ingressos</span>
              <span className="font-semibold text-[var(--text-primary)]">{(sale as any).quantity}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2 text-heading-3">
              <span className="text-[var(--text-secondary)]">Total pago</span>
              <span className="font-bold text-[var(--accent-text)]">R$ {Number((sale as any).total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-heading-3 font-bold text-[var(--text-primary)]">Seus Ingressos</h3>
          <div className="flex flex-col gap-4">
            {(sale.tickets || []).map((ticket: any) => (
              <div key={ticket.id} className="flex flex-col rounded-[var(--radius-lg)] bg-[var(--bg-primary)] overflow-hidden">
                <div className="flex items-center gap-4 p-4 border-b border-dashed border-[var(--border-subtle)]">
                  <div className="bg-white p-2 rounded-md">
                    <QRCodeSVG data-ticket-qr={ticket.id} value={ticket.ticket_code} size={64} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[var(--text-secondary)]">Participante</span>
                    <span className="font-bold text-[var(--text-primary)]">{ticket.participant_name}</span>
                    <span className="mt-1 text-[10px] font-mono text-[var(--text-secondary)]">{ticket.ticket_code}</span>
                  </div>
                </div>
                <Link 
                  to="/ingresso/$ticket_code" 
                  params={{ ticket_code: ticket.ticket_code }}
                  className="flex items-center justify-center gap-2 py-3 text-small font-semibold text-[var(--accent-text)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <QrCode className="h-4 w-4" />
                  Abrir QR Code
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button
            type="button"
            onClick={downloadAllTicketsPdf}
            disabled={isGeneratingPdf || !sale.tickets?.length}
            className="h-12 w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center gap-2"
          >
            {isGeneratingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            {isGeneratingPdf ? 'Gerando PDF...' : 'Baixar todos os ingressos (PDF)'}
          </Button>
          
          <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--accent-muted)] p-5 border border-[var(--accent)] border-dashed text-center">
            <p className="text-small text-[var(--text-primary)] mb-3 leading-snug">
              Quer acompanhar seus ingressos e pontuar em compras futuras?
            </p>
            <Button asChild className="w-full bg-[var(--accent)] text-[#111111] hover:bg-[var(--accent-hover)]">
              <Link 
                to="/cadastro" 
                search={{ 
                  org_id: (sale as any).organization_id,
                  whatsapp: (sale as any).buyer_whatsapp 
                }}
                className="flex items-center justify-center gap-2"
              >
                <UserPlus className="h-5 w-5" />
                Criar minha conta agora
              </Link>
            </Button>
          </div>

          <InstallAppButton />
        </div>
      </div>
    </MobileLayout>
  );
}
