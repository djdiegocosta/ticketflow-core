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

  return (
    <div className="flex flex-col h-full min-h-0">
      <WelcomeSplash userName={userName || ""} onComplete={() => setShowWelcome(true)} />

      <div className="px-4 pt-4 pb-2 shrink-0">
        <h1 className="text-heading-2 font-bold truncate">Seja Bem Vindo!</h1>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4">
        <ClientVitrine />
      </div>
    </div>
  );
}
