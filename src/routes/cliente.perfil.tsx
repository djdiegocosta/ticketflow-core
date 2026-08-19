import { useForm, Controller } from "react-hook-form";
import { formatName, maskWhatsApp, onlyDigits } from "@/lib/form-format";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCurrentCustomer, useUpdateProfile } from "@/lib/customer-queries";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(1, "Nome obrigatório"),
  whatsapp: z.string().min(1, "WhatsApp obrigatório"),
  email: z.string().email("E-mail inválido"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  data_nascimento: z.string().default(""),
  instagram: z.string().default(""),
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
      instagram: ""
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
        instagram: customer.instagram || ""
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

  // Cálculo de completude simples
  const fields = ['full_name', 'whatsapp', 'email', 'cidade', 'data_nascimento', 'instagram'];
  const completedFields = fields.filter(f => !!form.watch(f as any)).length;
  const completude = Math.round((completedFields / fields.length) * 100);

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

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-20">
        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">Nome completo</label>
          <input 
            {...form.register("full_name")}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              target.value = formatName(target.value);
            }}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
          {form.formState.errors.full_name && <p className="text-micro text-error">{form.formState.errors.full_name.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">WhatsApp</label>
          <input 
            {...form.register("whatsapp")}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              target.value = maskWhatsApp(target.value);
            }}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
          {form.formState.errors.whatsapp && <p className="text-micro text-error">{form.formState.errors.whatsapp.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-micro font-bold uppercase">E-mail</label>
          <input 
            {...form.register("email")}
            type="email"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
          {form.formState.errors.email && <p className="text-micro text-error">{form.formState.errors.email.message}</p>}
        </div>

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
          <label className="text-micro font-bold uppercase">Instagram</label>
          <input 
            {...form.register("instagram")}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
          />
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
