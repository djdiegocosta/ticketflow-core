import { useEffect, useState } from 'react';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useCustomerSales } from '@/lib/customer-queries';
import { offlineDB } from '@/lib/offline-db';
import { Ticket, Calendar, QrCode, Loader2, Database } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function MyTicketsPage() {
  const { isAuthenticated } = useAuth();
  const { data: customerSales = [], isLoading: isLoadingCustomer } = useCustomerSales();

  // Plano B pra exibição, quando não há internet: ingressos salvos
  // localmente da última vez que "Meus Ingressos" carregou com sucesso.
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineTickets, setOfflineTickets] = useState<any[]>([]);

  useEffect(() => {
    const checkStatus = async () => {
      if (!navigator.onLine) {
        const cached = await offlineDB.getMyTickets();
        setOfflineTickets(cached);
        setIsOfflineMode(true);
      } else {
        setIsOfflineMode(false);
      }
    };

    checkStatus();
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
    };
  }, []);

  if (isLoadingCustomer && isAuthenticated && !isOfflineMode) {
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
      <MobileLayout
        showFooter={false}
        headerContent={
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="text-center font-semibold text-small">Meus Ingressos</div>
            {isOfflineMode && (
              <div className="flex items-center gap-1 rounded-md bg-[var(--bg-tertiary)] px-1.5 py-0.5">
                <Database className="h-3 w-3 text-[var(--text-secondary)]" />
                <span className="text-[9px] font-medium uppercase text-[var(--text-secondary)]">Offline</span>
              </div>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-6 px-5 py-8">
          <h2 className="text-heading-2 font-bold text-[var(--text-primary)]">Suas Compras</h2>
          {isOfflineMode && (
            <p className="text-small text-[var(--text-secondary)] -mt-4">
              Disponível offline neste dispositivo. Sem internet, novas compras não aparecem aqui até reconectar.
            </p>
          )}
          {isOfflineMode ? (
            offlineTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-[var(--text-secondary)]">
                <Ticket className="h-12 w-12 opacity-20" />
                <p>Nenhum ingresso salvo neste dispositivo ainda. Abra "Meus Ingressos" com internet uma vez antes de usar offline.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {offlineTickets.map((t: any) => (
                  <Link
                    key={t.id}
                    to="/ingresso/$ticket_code"
                    params={{ ticket_code: t.ticket_code }}
                    className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-small font-bold text-[var(--text-primary)]">{t.event_name}</span>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">{t.participant_name} · {t.ticket_code}</span>
                    </div>
                    <QrCode className="h-5 w-5 text-[var(--text-secondary)]" />
                  </Link>
                ))}
              </div>
            )
          ) : customerSales.length === 0 ? (
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
      <div className="flex flex-col items-center justify-center gap-6 px-5 py-20 text-center">
        <Ticket className="h-12 w-12 opacity-20 text-[var(--text-secondary)]" />
        <div className="flex flex-col gap-2">
          <h2 className="text-heading-2 font-bold text-[var(--text-primary)]">Faça login para ver seus ingressos</h2>
          <p className="text-small text-[var(--text-secondary)]">
            Crie uma conta ou entre com o e-mail que usou na compra para acessar seus ingressos.
          </p>
        </div>
        <Button asChild className="w-full h-12 bg-[var(--accent)] text-[#111111]">
          <Link to="/login">Entrar ou criar conta</Link>
        </Button>
        <p className="text-xs text-[var(--text-secondary)]">
          Comprou sem cadastro e não consegue acessar? Entre em contato com nossa equipe.
        </p>
      </div>
    </MobileLayout>
  );
}

function SaleCard({ sale }: { sale: any }) {
  const eventName = sale.events?.title || sale.event_name || "Evento";
  const eventDate = sale.events?.event_date || sale.event_date;
  
  return (
 <div className="rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="text-heading-3 font-bold text-[var(--text-primary)]">{eventName}</h3>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-1">
              <Calendar className="h-3 w-3" />
              <span>{eventDate ? new Date(eventDate).toLocaleDateString('pt-BR') : '—'}</span>
            </div>
          </div>
 <span className="text-[10px] font-mono font-bold bg-[var(--bg-primary)] px-2 py-1 rounded">
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
 className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--bg-primary)] hover:border-[var(--accent)] transition-colors group"
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
