import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useState } from "react";

export const Route = createFileRoute("/cliente/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil | TicketFlow" },
      { name: "description", content: "Gerencie suas informações pessoais." },
      { property: "og:title", content: "Meu Perfil | TicketFlow" },
      { property: "og:description", content: "Gerencie suas informações pessoais." },
    ],
  }),
  component: Page_cliente_perfil,
});

function Page_cliente_perfil() {
  const form = useForm({
    defaultValues: {
      nome: "Marina Duarte",
      zap: "(11) 99999-9999",
      email: "cliente@ticketflow.com",
      cidade: "São Paulo",
      nasc: "1995-05-15",
      insta: "@marina.d"
    }
  });

  const [completude, setCompletude] = useState(85);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-heading-1">Perfil</h1>
      
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 rounded-[var(--radius-md)]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-small font-bold">Perfil {completude}% completo</span>
          <div className="w-24 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${completude}%` }} />
          </div>
        </div>
      </div>

      <form className="space-y-4">
        {[ "nome", "zap", "email", "cidade", "nasc", "insta" ].map(field => (
          <div key={field} className="space-y-1">
            <label className="text-micro font-bold uppercase">{field}</label>
            <input 
              {...form.register(field as any)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        ))}
        <button type="button" className="w-full bg-[var(--accent)] text-[#111111] font-bold py-3 rounded-[var(--radius-md)]">
          Salvar Alterações
        </button>
      </form>
    </div>
  );
}
