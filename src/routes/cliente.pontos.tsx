import { createFileRoute } from '@tanstack/react-router';
import { useCustomerXp } from "@/lib/customer-queries";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute('/cliente/pontos')({
  component: Page_cliente_pontos,
});

function Page_cliente_pontos() {
  const { data: xp, isLoading } = useCustomerXp();

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
