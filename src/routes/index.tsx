import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Relatório de Correções — TicketFlow" },
      {
        name: "description",
        content: "Relatório detalhado das correções realizadas no projeto TicketFlow.",
      },
    ],
  }),
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-8 font-sans text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl space-y-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">## Relatório de Correções por Fluxo</h1>
        
        <div className="space-y-4">
          <p>
            <strong>Objetivo:</strong> Apresentar um relatório detalhado das correções realizadas até o momento, com as informações organizadas por fluxo de trabalho.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">**Requisitos:**</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Visão Geral:</strong> Incluir um resumo geral das correções efetuadas.
            </li>
            <li>
              <strong>Detalhamento por Fluxo:</strong>
              <ul className="mt-2 list-circle space-y-1 pl-6">
                <li>Identificar cada fluxo de trabalho relevante.</li>
                <li>Para cada fluxo, listar as correções específicas aplicadas.</li>
                <li>Se possível, indicar a data ou período em que a correção foi realizada.</li>
                <li>Se aplicável, mencionar o impacto ou a natureza da correção (ex: bug crítico, melhoria de performance, ajuste de UI).</li>
              </ul>
            </li>
            <li>
              <strong>Formato:</strong> O relatório deve ser claro, conciso e de fácil leitura.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">**Passos Necessários:**</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Coletar dados sobre todas as correções implementadas.</li>
            <li>Agrupar as correções por fluxo de trabalho correspondente.</li>
            <li>Estruturar o relatório, iniciando com um resumo e, em seguida, detalhando cada fluxo.</li>
            <li>Revisar o relatório para garantir precisão e clareza.</li>
          </ol>
        </div>
        
        <div className="mt-12 pt-8 border-t border-[var(--border-subtle)]">
          <a href="/login" className="text-[var(--accent)] hover:underline">Ir para o Login →</a>
        </div>
      </div>
    </div>
  );
}
