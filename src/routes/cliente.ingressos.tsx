import { useEffect, useState, useMemo } from "react";
import { offlineDB } from "@/lib/offline-db";
import { Database, Loader2 } from "lucide-react";
import { useCustomerSales } from "@/lib/customer-queries";
import { Link } from "@tanstack/react-router";

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
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-md">
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
      
      <div className="space-y-3">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((t: any) => (
            <Link 
              key={t.id} 
              to="/ingresso/$ticket_code" 
              params={{ ticket_code: t.ticket_code }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 rounded-[var(--radius-md)] flex justify-between items-center active:scale-[0.98] transition-transform"
            >
              <div className="flex flex-col gap-0.5">
                <p className="font-semibold text-body">{t.event_name}</p>
                <p className="text-small text-[var(--text-secondary)]">
                  {new Date(t.event_date).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-micro text-[var(--text-disabled)] font-mono">{t.participant_name}</p>
              </div>
              <div className={`px-2 py-1 text-micro rounded-[var(--radius-sm)] ${
                t.status === 'Válido' ? 'bg-success/10 text-success' : 
                t.status === 'Utilizado' ? 'bg-warning/10 text-warning' : 
                'bg-error/10 text-error'
              }`}>
                {t.status}
              </div>
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
