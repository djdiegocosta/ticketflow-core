import { createFileRoute, redirect } from "@tanstack/react-router";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { requireSession } from "@/lib/auth-guard";
import { useEnsureCustomerRecord } from "@/lib/customer-queries";

function ClienteRoute() {
  // Garante o registro de cliente EM SEGUNDO PLANO (só quando ele realmente
  // não existe). Antes isso era um `await` no beforeLoad e bloqueava a
  // entrada da Área do Cliente a cada navegação.
  useEnsureCustomerRecord();
  return <MobileLayout />;
}

export const Route = createFileRoute("/cliente")({
  ssr: false,
  beforeLoad: async () => {
    const ctx = await requireSession();

    if (ctx.role === "operador_checkin") {
      throw redirect({ to: "/checkin" });
    }

    return { auth: ctx };
  },
  component: ClienteRoute,
});
