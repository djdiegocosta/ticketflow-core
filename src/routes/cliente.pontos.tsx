import { createFileRoute } from '@tanstack/react-router';
import { useCustomerXp } from "@/lib/customer-queries";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute('/cliente/pontos')({
  component: Page_cliente_pontos,
});

const TIER_ORDER = ["Novato", "Frequente", "VIP", "Elite", "Lenda"] as const;
const TIER_COLORS: Record<string, string> = {
  Novato: "#b4b2a9",
  Frequente: "#9c93b0",
  VIP: "#7c3aed",
  Elite: "#c9a227",
  Lenda: "#e0b23c",
};

function Shield({ color, size = 30, muted = false }: { color: string; size?: number; muted?: boolean }) {
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 52 58" fill="none" style={{ opacity: muted ? 0.35 : 1 }}>
      <path d="M26 2 L48 10 V28 C48 42 38 52 26 56 C14 52 4 42 4 28 V10 Z" fill={color} />
    </svg>
  );
}

export function Page_cliente_pontos() {
  const { data: xp, isLoading } = useCustomerXp();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const totalXp = xp?.totalXp ?? 0;
  const patente = xp?.patente ?? "Novato";
  const nextTier = xp?.nextTier ?? null;
  const progressPct = xp?.progressPct ?? 0;

  return (
    <div className="p-4 space-y-6">
      <div className="text-small font-medium text-[var(--text-secondary)] tracking-wide uppercase">Meu progresso</div>

      <div className="bg-[var(--accent)] text-white p-5 rounded-[var(--radius-md)]">
        <div className="flex items-center gap-3.5">
          <Shield color="#ffffff29" size={44} />
          <div>
            <div className="text-micro font-medium opacity-80">Patente atual</div>
            <div className="text-heading-2 font-medium mt-0.5">{patente}</div>
          </div>
        </div>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-4xl font-medium tabular-nums">{totalXp.toLocaleString('pt-BR')}</span>
          <span className="text-small opacity-80">XP</span>
        </div>

        <div className="mt-3.5">
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-micro opacity-80">
            <span>{totalXp.toLocaleString('pt-BR')}{nextTier ? ` / ${nextTier.min.toLocaleString('pt-BR')}` : ''}</span>
            <span>{nextTier ? `Faltam ${(nextTier.min - totalXp).toLocaleString('pt-BR')} XP para ${nextTier.patente}` : 'Patente máxima'}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between px-1">
        {TIER_ORDER.map((tier) => (
          <div key={tier} className="flex flex-col items-center gap-1.5">
            <Shield color={TIER_COLORS[tier]} size={tier === patente ? 34 : 28} muted={tier !== patente} />
            <span className={tier === patente ? "text-small font-medium text-[var(--text-primary)]" : "text-micro text-[var(--text-secondary)]"}>{tier}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-heading-3 font-bold text-[var(--text-primary)]">Histórico</h2>
        {xp?.history && xp.history.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {xp.history.map((h, i) => (
              <div key={i} className="flex justify-between items-center py-3">
                <div>
                  <p className="text-body font-medium text-[var(--text-primary)]">{h.label}</p>
                  <p className="text-small text-[var(--text-secondary)]">
                    {new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}
                  </p>
                </div>
                <span className="font-bold text-[var(--accent)]">+{h.amount}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-subtle)] p-8 rounded-[var(--radius-md)] text-center">
            <p className="text-small text-[var(--text-secondary)]">Nenhum XP ainda. Suas próximas ações já vão aparecer aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
