import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from "@/lib/auth-context";
import { useCustomerSales } from "@/lib/customer-queries";
import { Loader2 } from "lucide-react";
import { ClientVitrine } from "@/components/cliente/ClientVitrine";
import { SkeletonScreen } from "@/components/WelcomeSplash";
import { SkeletonScreen } from "@/components/WelcomeSplash";
import { useMinimalDelay } from "@/hooks/use-minimal-delay";
import { useEffect } from "react";

export const Route = createFileRoute('/cliente/')({
  component: Page_cliente_index,
});

export function Page_cliente_index() {
  const { userName } = useAuth();
  const { data: sales = [], isLoading } = useCustomerSales();
  const showSkeleton = useMinimalDelay(400);
  const isNewRegistration = localStorage.getItem('is_new_registration') === 'true';

  useEffect(() => {
    if (isNewRegistration) localStorage.removeItem('is_new_registration');
  }, [isNewRegistration]);

  if (isLoading) {
    return <SkeletonScreen variant="cliente" />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h1 className="text-heading-2 font-bold truncate">
          {isNewRegistration ? `Bem-vindo(a), ${userName || ""}!` : "Seja Bem Vindo!"}
        </h1>
      </div>
      <div className="flex-1 min-h-0 px-4 pb-4">
        <ClientVitrine />
      </div>
    </div>
  );
}
