import { createFileRoute } from '@tanstack/react-router';
import { ClientVitrine } from "@/components/cliente/ClientVitrine";
import { SkeletonScreen } from "@/components/WelcomeSplash";
import { useCustomerSales } from "@/lib/customer-queries";

export const Route = createFileRoute('/cliente/')({
  component: Page_cliente_index,
});

export function Page_cliente_index() {
  const { isLoading } = useCustomerSales();

  if (isLoading) {
    return <SkeletonScreen variant="cliente" />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 px-4 pb-4">
        <ClientVitrine />
      </div>
    </div>
  );
}
