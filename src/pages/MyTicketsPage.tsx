import { useState } from 'react';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { useCustomerSales, useSaleByCode } from '@/lib/customer-queries';
import { Search, Ticket, Calendar, QrCode, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function MyTicketsPage() {
  const [saleCode, setSaleCode] = useState('');
  const [manualSearchCode, setManualSearchCode] = useState<string | null>(null);
  
  const { isAuthenticated } = useAuth();
  const { data: customerSales = [], isLoading: isLoadingCustomer } = useCustomerSales();
  const { data: manualSale, isLoading: isLoadingManual, isError: manualError } = useSaleByCode(manualSearchCode || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleCode.trim()) return;
    setManualSearchCode(saleCode.trim().toUpperCase());
  };

  if (isLoadingCustomer && isAuthenticated) {
    return (
      <MobileLayout showFooter={false} headerContent={<div className="text-center font-semibold text-small">Meus Ingressos</div>}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        </div>
      </MobileLayout>
    );
  }

  // Se logado, exibe todos os ingressos automaticamente
  if (isAuthenticated) {
    return (
      <MobileLayout showFooter={false} headerContent={<div className="text-center font-semibold text-small">Meus Ingressos</div>}>
        <div className="flex flex-col gap-6 px-5 py-8">
          <h2 className="text-heading-2 font-bold text-[var(--text-primary)]">Suas Compras</h2>
          {customerSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-[var(--text-secondary)]">
              <Ticket className="h-12 w-12 opacity-20" />
              <p>Nenhum ingresso encontrado na sua conta.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {customerSales.map((sale: any) => (
                <SaleCard key={sale.id} sale={sale} />
              ))}
            </div>
          )}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showFooter={false} headerContent={<div className="text-center font-semibold text-small">Meus Ingressos</div>}>
      <div className="flex flex-col gap-6 px-5 py-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-heading-2 font-bold text-[var(--text-primary)]">Buscar Ingressos</h2>
          <p className="text-small text-[var(--text-secondary)]">Informe o código da sua venda para visualizar seus ingressos.</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <Input 
              placeholder="Ex: TF-ABC123" 
              className="pl-10 h-12"
              value={saleCode}
              onChange={(e) => setSaleCode(e.target.value.toUpperCase())}
            />
          </div>
          <Button type="submit" disabled={isLoadingManual} className="h-12 bg-[var(--accent)] text-[#111111]">
            {isLoadingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        {manualSearchCode && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            {manualSale ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-success">
                  <Ticket className="h-5 w-5" />
                  <span className="font-semibold text-small text-[var(--text-primary)]">Venda encontrada!</span>
                </div>
                <SaleCard sale={manualSale} />
              </div>
            ) : manualError ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-error/20 bg-error/5 p-8 text-center">
                <p className="text-small text-error font-semibold">Nenhuma venda encontrada com este código.</p>
                <p className="text-xs text-[var(--text-secondary)]">Verifique o código e tente novamente.</p>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)] p-6 text-center">
          <p className="text-small text-[var(--text-secondary)] mb-4">
            Deseja visualizar todos os seus ingressos automaticamente?
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Fazer login</Link>
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}

function SaleCard({ sale }: { sale: any }) {
  const eventName = sale.events?.title || sale.event_name || "Evento";
  const eventDate = sale.events?.event_date || sale.event_date;
  
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="text-heading-3 font-bold text-[var(--text-primary)]">{eventName}</h3>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-1">
              <Calendar className="h-3 w-3" />
              <span>{eventDate ? new Date(eventDate).toLocaleDateString('pt-BR') : '—'}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-[var(--bg-primary)] px-2 py-1 rounded border border-[var(--border-subtle)]">
            {sale.sale_code}
          </span>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider">
          {sale.tickets?.length} {sale.tickets?.length === 1 ? 'Ingresso' : 'Ingressos'}
        </div>
        <div className="flex flex-col gap-2">
          {sale.tickets?.map((ticket: any) => (
            <Link 
              key={ticket.id}
              to="/ingresso/$ticket_code" 
              params={{ ticket_code: ticket.ticket_code }}
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--accent)] transition-colors group"
            >
              <div className="flex flex-col">
                <span className="text-small font-bold text-[var(--text-primary)]">{ticket.participant_name}</span>
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">{ticket.ticket_code}</span>
              </div>
              <QrCode className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-[var(--accent-text)]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
