import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCustomerXpRules } from "@/lib/customer-queries";

export const Route = createFileRoute("/cliente/pontos/tabela")({
  component: CustomerXpRulesPage,
});

function CustomerXpRulesPage() {
  const { data: rules = [], isLoading, isError } = useCustomerXpRules();

  return (
    <div className="space-y-5 p-4">
      <Link
        to="/cliente/pontos"
        className="inline-flex items-center gap-2 text-small text-[var(--text-secondary)] hover:text-[var(--accent)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Pontos
      </Link>

      <header className="space-y-1">
        <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Tabela de Pontuação</h1>
        <p className="text-small text-[var(--text-secondary)]">
          Veja como acumular XP no TicketFlow.
        </p>
      </header>

      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : isError ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-small text-[var(--text-secondary)]">
          Não foi possível carregar a tabela agora. Tente novamente em instantes.
        </div>
      ) : (
        <section className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4">
          {rules.map((rule) => (
            <article key={rule.reason} className="flex items-start justify-between gap-3 py-3.5">
              <div className="min-w-0 space-y-1">
                <h2 className="text-body font-medium text-[var(--text-primary)]">{rule.label}</h2>
                <p className="text-small leading-relaxed text-[var(--text-secondary)]">{rule.description}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-small font-semibold tabular-nums text-[var(--accent)]">
                +{rule.points.toLocaleString("pt-BR")} XP
              </span>
            </article>
          ))}
        </section>
      )}

      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
        Os bônus são concedidos somente quando as condições de cada ação são atendidas.
        Algumas ações podem acumular na mesma compra. Pontos não possuem resgate de benefícios
        disponível neste momento.
      </p>
    </div>
  );
}
