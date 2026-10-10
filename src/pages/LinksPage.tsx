import { Link } from "@tanstack/react-router";
import { ArrowRight, KeyRound, LogIn, Ticket, UserPlus } from "lucide-react";
import { Brandmark } from "@/components/Brandmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNextPublicEvent } from "@/lib/links-queries";

const primaryClass =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-base font-semibold text-[#111111] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

const secondaryClass =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-5 py-3 text-base font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });
}

/**
 * Página pública /links — usada no link da bio do Instagram.
 * Mobile first: coluna única, botões largos com área de toque grande.
 */
export default function LinksPage() {
  const { data: event, isLoading } = useNextPublicEvent();

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center overflow-x-hidden px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-primary)] to-[var(--bg-secondary)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-30">
        <div className="absolute left-0 top-1/4 h-72 w-72 -translate-x-1/3 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 h-56 w-56 translate-x-1/3 rounded-full bg-[var(--accent)]/5 blur-3xl" />
      </div>

      <div className="flex w-full max-w-[420px] justify-end">
        <ThemeToggle />
      </div>

      <main className="flex w-full max-w-[420px] flex-1 flex-col items-center justify-center gap-10 py-8">
        <Brandmark size="xl" className="justify-center" />

        <section className="flex w-full flex-col items-center gap-5">
          <h1 className="text-center text-display text-[var(--text-primary)]">O que você deseja?</h1>

          {event ? (
            <>
              <Link to="/e/$slug" params={{ slug: event.slug }} className={primaryClass}>
                <Ticket className="h-5 w-5" aria-hidden="true" />
                Comprar ingresso
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <p className="-mt-2 text-center text-small text-[var(--text-secondary)]">
                {event.title} · {formatEventDate(event.event_date)}
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled
                className={`${primaryClass} cursor-not-allowed opacity-50 hover:bg-[var(--accent)]`}
              >
                <Ticket className="h-5 w-5" aria-hidden="true" />
                {isLoading ? "Carregando..." : "Comprar ingresso"}
              </button>
              {!isLoading && (
                <p className="-mt-2 text-center text-small text-[var(--text-secondary)]">
                  Nenhum evento à venda agora. Novidades em breve!
                </p>
              )}
            </>
          )}
        </section>

        <nav aria-label="Acesso à conta" className="flex w-full flex-col gap-3 pt-2">
          <Link to="/cadastro" className={secondaryClass}>
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            Criar Conta
          </Link>
          <Link to="/login" className={secondaryClass}>
            <LogIn className="h-5 w-5" aria-hidden="true" />
            Fazer Login
          </Link>
          <Link to="/recuperar-senha" className={secondaryClass}>
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            Redefinir Senha
          </Link>
        </nav>
      </main>
    </div>
  );
}
