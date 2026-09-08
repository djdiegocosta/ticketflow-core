import { createFileRoute } from '@tanstack/react-router';
import { ClientVitrine } from "@/components/cliente/ClientVitrine";
import { InstallAppButton } from "@/components/cliente/InstallAppButton";
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
      <div className="flex-1 min-h-0 px-4 pb-4 flex flex-col gap-3">
        <div className="flex-1 min-h-0">
          <ClientVitrine />
        </div>
        <div className="shrink-0">
          <InstallAppButton />
        </div>
      </div>
    </div>
  );
}
