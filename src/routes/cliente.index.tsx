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
    <div className="flex flex-col min-h-full">
      <WelcomeSplash userName={userName || ""} onComplete={() => setShowWelcome(true)} />
      
      <div className="p-4 space-y-6">
        <h1 className="text-heading-2 font-bold truncate">
          Seja Bem Vindo!
        </h1>

        <ClientVitrine />
      </div>
    </div>
  );
}
