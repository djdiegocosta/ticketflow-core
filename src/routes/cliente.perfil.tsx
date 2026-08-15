import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { useState } from "react";
import { formatName, maskWhatsApp, onlyDigits } from "@/lib/form-format";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const profileSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  zap: z.string().min(1, "WhatsApp obrigatório"),
  email: z.string().email("E-mail inválido"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  nasc: z.string().optional(),
  insta: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;


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
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
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
        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">Nome completo</label>
          <input 
            {...form.register("nome")}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              target.value = formatName(target.value);
            }}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">WhatsApp</label>
          <input 
            {...form.register("zap")}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              target.value = maskWhatsApp(target.value);
            }}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">E-mail</label>
          <input 
            {...form.register("email")}
            type="email"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">Cidade</label>
          <Controller
            control={form.control}
            name="cidade"
            render={({ field }) => {
              return (
                <div className="flex flex-col gap-1">
                  <CityAutocomplete
                    value={field.value}
                    onChange={field.onChange}
                    uf={null}
                    className="rounded-[var(--radius-sm)]"
                  />
                  {form.formState.errors.cidade && (
                    <span className="text-small text-error">{form.formState.errors.cidade.message}</span>
                  )}
                </div>
              );
            }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">Data de Nascimento</label>
          <input 
            {...form.register("nasc")}
            type="date"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">Instagram</label>
          <input 
            {...form.register("insta")}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <button type="button" className="w-full bg-[var(--accent)] text-[#111111] font-bold py-3 rounded-[var(--radius-md)]">
          Salvar Alterações
        </button>
      </form>

    </div>
  );
}
