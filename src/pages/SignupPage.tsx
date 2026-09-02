import { useState, useMemo } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formatName, isFullName, maskWhatsApp, onlyDigits } from "@/lib/form-format";
import { SmartField } from "@/components/ui/smart-field";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { getUFByDDD } from "@/lib/ibge-data";

const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nome obrigatório")
      .refine(isFullName, "Digite seu nome completo (mínimo 2 palavras)"),
    whatsapp: z
      .string()
      .min(1, "WhatsApp obrigatório")
      .refine((val) => onlyDigits(val).length >= 11, "WhatsApp deve ter 11 dígitos"),
    email: z.string().email("E-mail inválido").min(1, "E-mail obrigatório"),
    city: z.string().min(1, "Cidade obrigatória"),
    sexo: z.enum(["masculino", "feminino", "prefiro_nao_informar"]).optional(),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação de senha obrigatória"),
  })

  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { org_id, whatsapp } = useSearch({ from: "/cadastro" }) as {
    org_id?: string;
    whatsapp?: string;
  };

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      whatsapp: whatsapp || "",
      email: "",
      city: "",
      sexo: undefined,
      password: "",
      confirmPassword: "",
    },

    mode: "onChange",
  });

  const onSubmit = async (data: SignupFormValues) => {
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: formatName(data.name),
          whatsapp: data.whatsapp,
          cidade: data.city,
          sexo: data.sexo || null,
        },
      },
    });

    if (error) {
      form.setError("email", {
        message: error.message.toLowerCase().includes("already")
          ? "Este e-mail já está cadastrado"
          : error.message,
      });
      return;
    }

    if (result.session) {
      if (org_id) {
        await supabase.rpc("get_or_create_customer", { _organization_id: org_id });
      }
      localStorage.setItem("is_new_registration", "true");
      toast.success("Conta criada com sucesso!");

      navigate({ to: "/cliente" });
      return;
    }

    toast.success("Conta criada! Confirme seu e-mail para acessar.");
  };

  return (
    <MobileLayout showFooter={false}>
      <div className="flex flex-col items-center justify-center p-4 py-8">
        <Card className="w-full max-w-[440px] bg-bg-secondary border-border-default shadow-md rounded-lg">
          <CardHeader className="pb-2">
            <h2 className="text-heading-1 text-center">Criar conta</h2>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <SmartField
                        label="Nome completo"
                        icon={User}
                        value={field.value}
                        onChange={(v) => field.onChange(formatName(v))}
                        isValid={isFullName(field.value)}
                        placeholder="Nome Sobrenome"
                        error={form.formState.errors.name?.message as string}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <SmartField
                        label="WhatsApp"
                        icon={Phone}
                        value={field.value}
                        onChange={(v) => field.onChange(maskWhatsApp(v))}
                        isValid={onlyDigits(field.value).length === 11}
                        placeholder="(00) 00000-0000"
                        inputMode="tel"
                        error={form.formState.errors.whatsapp?.message as string}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <SmartField
                        label="E-mail"
                        icon={Mail}
                        value={field.value}
                        onChange={(v) => field.onChange(v.trim())}
                        isValid={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)}
                        placeholder="seu@email.com"
                        type="email"
                        inputMode="email"
                        error={form.formState.errors.email?.message as string}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => {
                    const whatsappValue = form.watch("whatsapp");
                    const digits = onlyDigits(whatsappValue);
                    const ddd = digits.slice(0, 2);
                    const uf = getUFByDDD(ddd);

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <CityAutocomplete value={field.value} onChange={field.onChange} uf={uf} />
                        </FormControl>
                        <FormMessage className="text-small text-error" />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="sexo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo (opcional)</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full h-10 bg-bg-secondary border border-border-default rounded-md px-3 text-small outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="">Selecione...</option>
                          <option value="masculino">Masculino</option>
                          <option value="feminino">Feminino</option>
                          <option value="prefiro_nao_informar">Prefiro não informar</option>
                        </select>
                      </FormControl>
                      <FormMessage className="text-small text-error" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="••••••••"
                            type={showPassword ? "text" : "password"}
                            {...field}
                            className="bg-bg-secondary border-border-default focus-visible:ring-accent pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-small text-error" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="••••••••"
                            type={showConfirmPassword ? "text" : "password"}
                            {...field}
                            className="bg-bg-secondary border-border-default focus-visible:ring-accent pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-small text-error" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent-hover text-[#111111] font-semibold rounded-md mt-2"
                  disabled={!form.formState.isValid}
                >
                  Criar conta
                </Button>

                <div className="text-center mt-4">
                  <span className="text-small text-text-secondary">Já tem uma conta? </span>
                  <Link
                    to="/login"
                    className="text-small text-accent-text font-semibold hover:underline"
                  >
                    Entrar
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
