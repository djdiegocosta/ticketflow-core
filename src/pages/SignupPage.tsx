import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
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

const formatName = (name: string) => {
  const words = name.split(" ");
  const connectives = ["de", "da", "do", "dos", "das", "e"];
  
  return words
    .map((word) => {
      if (word.length === 0) return "";
      const lowerWord = word.toLowerCase();
      if (connectives.includes(lowerWord)) return lowerWord;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

const maskWhatsApp = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};


const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nome obrigatório")
      .refine(
        (val) => val.trim().split(/\s+/).length >= 2,
        "Digite seu nome completo (mínimo 2 palavras)"
      ),
    whatsapp: z
      .string()
      .min(1, "WhatsApp obrigatório")
      .refine(
        (val) => val.replace(/\D/g, "").length >= 11,
        "WhatsApp deve ter 11 dígitos"
      ),
    email: z.string().email("E-mail inválido").min(1, "E-mail obrigatório"),
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

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      whatsapp: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const onSubmit = (data: SignupFormValues) => {
    toast.info("Funcionalidade em desenvolvimento");
    console.log("Signup data:", data);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary p-4 py-8">
      <div className="mb-8">
        <h1 className="text-display text-accent font-bold">TicketFlow</h1>
      </div>

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
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome Sobrenome"
                        value={field.value}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.value = formatName(target.value);
                          field.onChange(target.value);
                        }}


                        className="bg-bg-secondary border-border-default focus-visible:ring-accent"
                      />
                    </FormControl>
                    <FormMessage className="text-small text-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        value={field.value}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.value = maskWhatsApp(target.value);
                          field.onChange(target.value);
                        }}


                        className="bg-bg-secondary border-border-default focus-visible:ring-accent"
                      />
                    </FormControl>
                    <FormMessage className="text-small text-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="seu@email.com"
                        type="email"
                        {...field}
                        className="bg-bg-secondary border-border-default focus-visible:ring-accent"
                      />
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
                <span className="text-small text-text-secondary">
                  Já tem uma conta?{" "}
                </span>
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
  );
}
