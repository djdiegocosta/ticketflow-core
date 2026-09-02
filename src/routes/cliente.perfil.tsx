import { createFileRoute } from '@tanstack/react-router';
import { useForm, Controller } from "react-hook-form";
import { formatName, maskWhatsApp, onlyDigits, isFullName } from "@/lib/form-format";
import { SmartField } from "@/components/ui/smart-field";
import { User, Phone, Mail } from "lucide-react";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCurrentCustomer, useUpdateProfile } from "@/lib/customer-queries";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute('/cliente/perfil')({
  component: Page_cliente_perfil,
});

const profileSchema = z.object({
  full_name: z.string().min(1, "Nome obrigatório"),
  whatsapp: z.string().min(1, "WhatsApp obrigatório"),
  email: z.string().email("E-mail inválido"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  data_nascimento: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  sexo: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function Page_cliente_perfil() {
  const { data: customer, isLoading } = useCurrentCustomer();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      whatsapp: "",
      email: "",
      cidade: "",
      data_nascimento: "",
      instagram: "",
      sexo: ""
    }
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        full_name: customer.full_name || "",
        whatsapp: customer.whatsapp || "",
        email: customer.email || "",
        cidade: customer.cidade || "",
        data_nascimento: customer.data_nascimento || "",
        instagram: customer.instagram || "",
        sexo: customer.sexo || ""
      });
    }
  }, [customer, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-heading-1">Perfil</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-20">
        <SmartField label="Nome completo" icon={User} value={form.watch("full_name")} onChange={(v) => form.setValue("full_name", formatName(v), { shouldValidate: true })} isValid={isFullName(form.watch("full_name"))} placeholder="Nome Sobrenome" error={form.formState.errors.full_name?.message as string} />

        <SmartField label="WhatsApp" icon={Phone} value={form.watch("whatsapp")} onChange={(v) => form.setValue("whatsapp", maskWhatsApp(v), { shouldValidate: true })} isValid={onlyDigits(form.watch("whatsapp")).length === 11} placeholder="(00) 00000-0000" inputMode="tel" error={form.formState.errors.whatsapp?.message as string} />

        <SmartField label="E-mail" icon={Mail} value={form.watch("email")} onChange={(v) => form.setValue("email", v.trim(), { shouldValidate: true })} isValid={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.watch("email"))} placeholder="exemplo@email.com" type="email" inputMode="email" error={form.formState.errors.email?.message as string} />

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">Cidade</label>
          <Controller
            control={form.control}
            name="cidade"
            render={({ field }) => (
              <CityAutocomplete
                value={field.value}
                onChange={field.onChange}
                uf={null}
                className="rounded-[var(--radius-sm)]"
              />
            )}
          />
          {form.formState.errors.cidade && <p className="text-micro text-error">{form.formState.errors.cidade.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">Data de Nascimento</label>
          <input
            {...form.register("data_nascimento")}
            type="date"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">Sexo</label>
          <select
            {...form.register("sexo")}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Selecione...</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="prefiro_nao_informar">Prefiro não informar</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="w-full bg-[var(--accent)] text-[#111111] font-bold py-3 rounded-[var(--radius-md)] flex items-center justify-center gap-2"
        >
          {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar Alterações
        </button>
      </form>
    </div>
  );
}
