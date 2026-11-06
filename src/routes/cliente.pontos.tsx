import { useState } from "react";
import { createFileRoute } from '@tanstack/react-router';
import { useCustomerXp, useCustomerXpRules } from "@/lib/customer-queries";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";

export const Route = createFileRoute('/cliente/pontos')({
  component: Page_cliente_pontos,
});

function Page_cliente_pontos() {
  const [showRules, setShowRules] = useState(false);
  const { data: xp, isLoading } = useCustomerXp();
  const { data: rules = [], isLoading: rulesLoading, isError: rulesError } = useCustomerXpRules();

  if (showRules) {
    return (
      <div className="space-y-5 p-4">
        <button
          type="button"
          onClick={() => setShowRules(false)}
          className="inline-flex items-center gap-2 text-small text-[var(--text-secondary)] hover:text-[var(--accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Pontos
        </button>
        <header className="space-y-1">
          <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Tabela de Pontuação</h1>
          <p className="text-small text-[var(--text-secondary)]">Veja como acumular XP no TicketFlow.</p>
        </header>
        {rulesLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : rulesError ? (
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

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const totalXp = xp?.totalXp ?? 0;

  return (
    <div className="p-4 space-y-6">
      <div className="text-small font-medium text-[var(--text-secondary)] tracking-wide uppercase">Meu XP</div>
      <section className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-5 rounded-[var(--radius-md)]">
        <div className="text-small text-[var(--text-secondary)]">Saldo de pontos</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums text-[var(--text-primary)]">{totalXp.toLocaleString('pt-BR')}</span>
          <span className="text-small text-[var(--text-secondary)]">XP</span>
        </div>
        <p className="mt-3 text-small text-[var(--text-secondary)]">Acumule pontos em compras pagas e participação nos eventos. Benefícios para resgate poderão ser disponibilizados futuramente.</p>
        <button
          type="button"
          onClick={() => setShowRules(true)}
          className="mt-4 flex w-full items-center gap-2 border-t border-[var(--border-subtle)] pt-3 text-small font-medium text-[var(--accent)]"
        >
          <BookOpen className="h-4 w-4" />
          Tabela de Pontuação
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-heading-3 font-bold text-[var(--text-primary)]">Histórico de pontos</h2>
        {xp?.history && xp.history.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {xp.history.map((h, i) => (
              <div key={i} className="flex justify-between items-center py-3 gap-4">
                <div>
                  <p className="text-body font-medium text-[var(--text-primary)]">{h.label}</p>
                  <p className="text-small text-[var(--text-secondary)]">
                    {new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })}
                  </p>
                </div>
                <span className="font-bold text-[var(--accent)] whitespace-nowrap">+{h.amount.toLocaleString('pt-BR')} XP</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-subtle)] p-8 rounded-[var(--radius-md)] text-center">
            <p className="text-small text-[var(--text-secondary)]">Nenhum XP registrado ainda. Seus pontos aparecerão aqui quando você realizar ações elegíveis com sua conta.</p>
          </div>
        )}
      </section>
    </div>
  );
}
