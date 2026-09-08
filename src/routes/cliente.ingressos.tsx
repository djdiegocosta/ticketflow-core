import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from "react";
import { offlineDB } from "@/lib/offline-db";
import { Database, Loader2, Clock } from "lucide-react";
import { useCustomerSales, ticketStatusMeta } from "@/lib/customer-queries";
import { Link } from "@tanstack/react-router";
import { StatusPill } from "@/components/admin/DataTable";

export const Route = createFileRoute('/cliente/ingressos')({
  component: Page_cliente_ingressos,
});


export function Page_cliente_ingressos() {
  const { data: sales = [], isLoading } = useCustomerSales();
  const [offlineTickets, setOfflineTickets] = useState<any[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [filter, setFilter] = useState<'Próximos' | 'Passados' | 'Todos'>('Próximos');

  useEffect(() => {
    const checkStatus = async () => {
      if (!navigator.onLine) {
        const cached = await offlineDB.getMyTickets();
        if (cached) {
          setOfflineTickets(cached);
          setIsOfflineMode(true);
        }
      } else {
        setIsOfflineMode(false);
      }
    };

    checkStatus();
    window.addEventListener('online', () => setIsOfflineMode(false));
    window.addEventListener('offline', checkStatus);
    
    return () => {
      window.removeEventListener('online', () => setIsOfflineMode(false));
      window.removeEventListener('offline', checkStatus);
    };
  }, []);

  const pendingSales = useMemo(() => {
    if (isOfflineMode) return [];
    return (sales as any[]).filter((s) => s.status === 'pendente');
  }, [sales, isOfflineMode]);

  const allTickets = useMemo(() => {
    if (isOfflineMode) return offlineTickets;
    
    return sales.flatMap((s: any) => s.tickets.map((t: any) => ({
      ...t,
      event_name: s.events?.title,
      event_date: s.events?.event_date,
      event_location: s.events?.location,
      sale_status: s.status
    })));
  }, [sales, offlineTickets, isOfflineMode]);

  const filteredTickets = useMemo(() => {
    const now = new Date();
    return allTickets.filter((t: any) => {
      if (filter === 'Todos') return true;
      const eventDate = new Date(t.event_date);
      if (filter === 'Próximos') return eventDate >= now;
      if (filter === 'Passados') return eventDate < now;
      return true;
    }).sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [allTickets, filter]);

  if (isLoading && !isOfflineMode) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-1">Meus Ingressos</h1>
        {isOfflineMode && (
 <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-secondary)] rounded-md">
            <Database className="h-3 w-3 text-[var(--text-secondary)]" />
            <span className="text-[10px] text-[var(--text-secondary)] uppercase font-medium">Offline</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        {(['Próximos', 'Passados', 'Todos'] as const).map((f) => (
          <button 
            key={f} 
            onClick={() => setFilter(f)}
            className={`px-3 py-1 border rounded-[var(--radius-full)] text-small transition-colors ${
              filter === f 
                ? 'bg-[var(--accent)] text-[#111111] border-[var(--accent)]' 
                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {pendingSales.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-small font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Aguardando pagamento</h2>
          {pendingSales.map((s: any) => {
            const minutesLeft = s.expires_at
              ? Math.max(0, Math.round((new Date(s.expires_at).getTime() - Date.now()) / 60000))
              : null;
            return (
              <Link
                key={s.id}
                to="/e/$slug/checkout"
                params={{ slug: s.events?.slug }}
                search={{ resume: s.id }}
                className="bg-[var(--bg-secondary)] border border-dashed border-[var(--accent)] p-4 rounded-[var(--radius-md)] flex justify-between items-center active:scale-[0.98] transition-transform"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="font-semibold text-body">{s.events?.title}</p>
                  <p className="text-small text-[var(--text-secondary)]">
                    {s.quantity}x ingresso{s.quantity > 1 ? 's' : ''} · R$ {Number(s.total_amount || 0).toFixed(2)}
                  </p>
                  {minutesLeft !== null && (
                    <p className="flex items-center gap-1 text-micro text-[var(--text-disabled)]">
                      <Clock className="h-3 w-3" />
                      {minutesLeft > 0 ? `Expira em ${minutesLeft} min · toque para pagar` : 'Expirando...'}
                    </p>
                  )}
                </div>
                <StatusPill tone="warning">Aguardando pagamento</StatusPill>
              </Link>
            );
          })}
        </div>
      )}
      
      <div className="space-y-3">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((t: any) => (
            <Link 
              key={t.id} 
              to="/ingresso/$ticket_code" 
              params={{ ticket_code: t.ticket_code }}
 className="bg-[var(--bg-secondary)] p-4 rounded-[var(--radius-md)] flex justify-between items-center active:scale-[0.98] transition-transform"
            >
              <div className="flex flex-col gap-0.5">
                <p className="font-semibold text-body">{t.event_name}</p>
                <p className="text-small text-[var(--text-secondary)]">
                  {new Date(t.event_date).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-micro text-[var(--text-disabled)] font-mono">{t.participant_name}</p>
              </div>
              <StatusPill tone={ticketStatusMeta(t.status).tone}>
                {ticketStatusMeta(t.status).label}
              </StatusPill>
            </Link>
          ))
        ) : (
          <div className="bg-[var(--bg-tertiary)]/30 border border-dashed border-[var(--border-subtle)] p-12 rounded-[var(--radius-md)] text-center">
            <p className="text-small text-[var(--text-secondary)]">Nenhum ingresso encontrado para esta categoria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
