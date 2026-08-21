import { useAuth } from "@/lib/auth-context";
import { useCustomerStats, useCustomerSales } from "@/lib/customer-queries";
import { Loader2 } from "lucide-react";
import { ClientVitrine } from "@/components/cliente/ClientVitrine";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { useState, useEffect } from "react";


export function Page_cliente_index() {
  const { userName } = useAuth();
  const { points, totalEvents, totalTickets } = useCustomerStats();
  const { data: sales = [], isLoading } = useCustomerSales();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const isNewRegistration = localStorage.getItem('is_new_registration');
    if (isNewRegistration === 'true') {
      setShowWelcome(true);
      localStorage.removeItem('is_new_registration');
    }
  }, []);


  
  const stats = [
    { label: "Eventos", value: totalEvents },
    { label: "Ingressos", value: totalTickets },
    { label: "Pontos", value: points },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const upcomingEvents = sales.filter((s: any) => 
    s.status === 'pago' && new Date(s.events?.event_date) > new Date()
  ).slice(0, 3);

  const pastEvents = sales.filter((s: any) => 
    s.status === 'pago' && new Date(s.events?.event_date) <= new Date()
  ).slice(0, 3);

  return (
    <div className="space-y-6">
      <WelcomeSplash userName={userName || ""} onComplete={() => setShowWelcome(true)} />
      <ClientVitrine />

      
      <div className="p-4 space-y-6">
        <h1 className="text-heading-1">
          {showWelcome ? "Que bom que você chegou!" : "Olá,"} {userName}!
        </h1>

      
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3 rounded-[var(--radius-md)] text-center">
            <div className="text-heading-2 font-bold text-[var(--accent)]">{stat.value}</div>
            <div className="text-micro text-[var(--text-secondary)] uppercase">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-heading-2 font-bold">Próximos eventos</h2>
        {upcomingEvents.length > 0 ? (
          <div className="flex flex-col gap-3">
            {upcomingEvents.map((sale: any) => (
              <div key={sale.id} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 rounded-[var(--radius-md)]">
                <p className="font-semibold">{sale.events?.title}</p>
                <p className="text-small text-[var(--text-secondary)]">
                  {new Date(sale.events?.event_date).toLocaleDateString('pt-BR')} • {sale.quantity} ingresso{sale.quantity > 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-tertiary)]/30 border border-dashed border-[var(--border-subtle)] p-6 rounded-[var(--radius-md)] text-center">
            <p className="text-small text-[var(--text-secondary)]">Nenhum evento futuro encontrado.</p>
          </div>
        )}
      </div>

      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-heading-2 font-bold">Eventos passados</h2>
          <div className="flex flex-col gap-3">
            {pastEvents.map((sale: any) => (
              <div key={sale.id} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 rounded-[var(--radius-md)] opacity-80">
                <p className="font-semibold">{sale.events?.title}</p>
                <p className="text-small text-[var(--text-secondary)]">
                  {new Date(sale.events?.event_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>

  );
}
