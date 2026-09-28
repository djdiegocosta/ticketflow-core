import { useLocation } from "@tanstack/react-router";
import { SkeletonScreen } from "@/components/WelcomeSplash";
import { Brandmark } from "@/components/Brandmark";

/**
 * Estrutura visual mínima exibida IMEDIATAMENTE enquanto uma rota ainda está
 * resolvendo (guard/carregamento). Para rotas `ssr: false` (Admin, Cliente,
 * Check-in) ela também é o que o servidor entrega no HTML, então o usuário
 * nunca fica olhando uma tela totalmente branca.
 *
 * Reaproveita o SkeletonScreen já adotado pelo TicketFlow (DESIGN-SYSTEM.md,
 * "Skeleton Screen") — sem nova identidade visual, sem animação pesada.
 * É um complemento: a causa real da demora foi tratada no boot/guard.
 */
export function RoutePending() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/checkin");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)]" aria-busy="true">
      <header className="flex h-16 shrink-0 items-center border-b border-[var(--border-subtle)] px-4 md:px-6">
        <Brandmark size="sm" />
      </header>
      <main className="flex-1">
        <SkeletonScreen variant={isAdmin ? "admin" : "cliente"} />
      </main>
    </div>
  );
}
