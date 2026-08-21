import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from "@/lib/auth-context";
import { useCustomerSales } from "@/lib/customer-queries";
import { Loader2 } from "lucide-react";
import { ClientVitrine } from "@/components/cliente/ClientVitrine";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { useState, useEffect } from "react";

export const Route = createFileRoute('/cliente/')({
  component: Page_cliente_index,
});

export function Page_cliente_index() {
  const { userName } = useAuth();
  const { data: sales = [], isLoading } = useCustomerSales();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const isNewRegistration = localStorage.getItem('is_new_registration');
    if (isNewRegistration === 'true') {
      setShowWelcome(true);
      localStorage.removeItem('is_new_registration');
    }
  }, []);

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

  return (
    <div className="flex flex-col min-h-full">
      <WelcomeSplash userName={userName || ""} onComplete={() => setShowWelcome(true)} />
      
      <div className="p-4 space-y-6">
        <h1 className="text-heading-2 font-bold truncate">
          {showWelcome ? "Que bom que você chegou," : "Olá,"} {userName}!
        </h1>

        <div className="space-y-4">
          <h2 className="text-heading-2 font-bold">Próximos eventos</h2>
          {upcomingEvents.length > 0 ? (
            <div className="flex flex-col gap-3">
              {upcomingEvents.map((sale: any) => (
                <div key={sale.id} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 rounded-none">
                  <p className="font-semibold">{sale.events?.title}</p>
                  <p className="text-small text-[var(--text-secondary)]">
                    {new Date(sale.events?.event_date).toLocaleDateString('pt-BR')} • {sale.quantity} ingresso{sale.quantity > 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--bg-tertiary)]/30 border border-dashed border-[var(--border-subtle)] p-6 rounded-none text-center">
              <p className="text-small text-[var(--text-secondary)]">Nenhum evento futuro encontrado.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <ClientVitrine />
      </div>
    </div>
  );
}
