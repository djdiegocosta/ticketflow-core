import { createFileRoute } from '@tanstack/react-router';
import { useCurrentCustomer } from "@/lib/customer-queries";
import { Loader2, User } from "lucide-react";

export const Route = createFileRoute('/cliente/pontos')({
  component: Page_cliente_pontos,
});


export function Page_cliente_pontos() {
  const { data: customer, isLoading } = useCurrentCustomer();

  const history = customer?.points_ledger || [];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-[var(--accent)] text-[#111111] p-6 rounded-[var(--radius-md)] text-center shadow-lg">
        <div className="text-micro font-bold uppercase tracking-wider opacity-80">Saldo Atual</div>
        <div className="text-5xl font-bold mt-1">{customer?.points || 0}</div>
        <div className="text-small opacity-80 mt-1">pontos acumulados</div>
      </div>

      <div className="space-y-3">
        <h2 className="text-heading-2 font-bold">Histórico</h2>
        {history.length > 0 ? (
          history.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((h: any, i: number) => (
            <div key={i} className="flex justify-between items-center border-b border-[var(--border-subtle)] py-3">
              <div>
                <p className="text-body font-medium">{h.reason}</p>
                <p className="text-small text-[var(--text-secondary)]">
                  {new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
              <span className="font-bold text-[var(--accent)]">
                {h.points > 0 ? `+${h.points}` : h.points}
              </span>
            </div>
          ))
        ) : (
          <div className="bg-[var(--bg-tertiary)]/30 border border-dashed border-[var(--border-subtle)] p-8 rounded-[var(--radius-md)] text-center">
            <p className="text-small text-[var(--text-secondary)]">Nenhum histórico de pontos encontrado.</p>
          </div>
        )}

        <div className="space-y-1 pt-4 border-t border-[var(--border-subtle)]">
          <label className="text-micro font-bold uppercase">Sexo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-disabled)] pointer-events-none" />
            <select
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] h-12 pl-10 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">Selecione...</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="prefiro_nao_informar">Prefiro não informar</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
