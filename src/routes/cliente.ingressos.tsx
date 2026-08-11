import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cliente/ingressos")({
  head: () => ({
    meta: [
      { title: "Meus Ingressos | TicketFlow" },
      { name: "description", content: "Gerencie seus ingressos e participe de eventos." },
      { property: "og:title", content: "Meus Ingressos | TicketFlow" },
      { property: "og:description", content: "Gerencie seus ingressos e participe de eventos." },
    ],
  }),
  component: Page_cliente_ingressos,
});

function Page_cliente_ingressos() {
  const tickets = [
    { id: 1, event: "Festa de Verão", date: "15/08/2026", status: "Válido" },
    { id: 2, event: "Festa de Verão", date: "15/08/2026", status: "Válido" },
    { id: 3, event: "Show do Ano", date: "22/08/2026", status: "Válido" },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-heading-1">Meus Ingressos</h1>
      <div className="flex gap-2">
        {["Próximos", "Passados", "Todos"].map((f) => (
          <button key={f} className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-full)] text-small">
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 rounded-[var(--radius-md)] flex justify-between items-center">
            <div>
              <p className="font-semibold">{t.event}</p>
              <p className="text-small text-[var(--text-secondary)]">{t.date}</p>
            </div>
            <div className="bg-[var(--accent-muted)] text-[var(--accent-text)] px-2 py-1 text-micro rounded-[var(--radius-sm)]">
              {t.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
