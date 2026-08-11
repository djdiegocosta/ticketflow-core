import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/cliente/pontos")({
  component: Page_cliente_pontos,
});

function Page_cliente_pontos() {
  const history = [
    { desc: "Perfil completo", pts: "+50", date: "10/08" },
    { desc: "Compra confirmada: Festa de Verão", pts: "+30", date: "09/08" },
    { desc: "Compra confirmada: Show do Ano", pts: "+30", date: "08/08" },
    { desc: "Check-in realizado: Workshop", pts: "+20", date: "10/07" },
    { desc: "Bônus de fidelidade", pts: "+20", date: "01/07" },
    { desc: "Cadastro inicial", pts: "+30", date: "01/06" },
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="bg-[var(--accent)] text-[#111111] p-6 rounded-[var(--radius-md)] text-center shadow-lg">
        <div className="text-micro font-bold uppercase tracking-wider opacity-80">Saldo Atual</div>
        <div className="text-5xl font-bold mt-1">180</div>
        <div className="text-small opacity-80 mt-1">pontos acumulados</div>
      </div>

      <div className="space-y-3">
        <h2 className="text-heading-2 font-bold">Histórico</h2>
        {history.map((h, i) => (
          <div key={i} className="flex justify-between items-center border-b border-[var(--border-subtle)] py-3">
            <div>
              <p className="text-body font-medium">{h.desc}</p>
              <p className="text-small text-[var(--text-secondary)]">{h.date}</p>
            </div>
            <span className="font-bold text-[var(--accent)]">{h.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
