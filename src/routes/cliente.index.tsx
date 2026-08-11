import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/cliente/")({
  component: Page_cliente_index,
});

function Page_cliente_index() {
  const { userName } = useAuth();
  
  const stats = [
    { label: "Eventos", value: "3" },
    { label: "Ingressos", value: "5" },
    { label: "Pontos", value: "180" },
  ];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-heading-1">Olá, {userName}!</h1>
      
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3 rounded-[var(--radius-md)] text-center">
            <div className="text-heading-2 font-bold text-[var(--accent)]">{stat.value}</div>
            <div className="text-micro text-[var(--text-secondary)] uppercase">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-heading-2 font-bold">Próximos eventos</h2>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 rounded-[var(--radius-md)]">
          <p className="font-semibold">Festa de Verão</p>
          <p className="text-small text-[var(--text-secondary)]">15/08/2026 • 2 ingressos</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-heading-2 font-bold">Eventos passados</h2>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 rounded-[var(--radius-md)] opacity-80">
          <p className="font-semibold">Workshop de Tech</p>
          <p className="text-small text-[var(--text-secondary)]">10/07/2026</p>
        </div>
      </div>
    </div>
  );
}
