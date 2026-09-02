import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Brandmark } from "@/components/Brandmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido").min(1, "E-mail obrigatório"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, userRole, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (userRole === "admin" || userRole === "colaborador") {
        navigate({ to: "/admin", replace: true });
      } else if (userRole === "cliente") {
        navigate({ to: "/cliente", replace: true });
      } else if (userRole === "operador_checkin") {
        navigate({ to: "/checkin", replace: true });
      }
    }
  }, [isLoading, isAuthenticated, userRole, navigate]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "all",
  });

  const onSubmit = async (data: LoginFormValues) => {
    const { error } = await login(data.email, data.password);
    if (!error) {
      toast.success("Login realizado com sucesso!");
    } else {
      form.setError("password", {
        message: error.toLowerCase().includes("invalid") ? "E-mail ou senha incorretos" : error,
      });
    }
  };

  return (
    <>
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Background decorativo */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-primary)] to-[var(--bg-secondary)]" />
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[var(--accent)]/5 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-1.5">
          <Brandmark size="lg" />
          <p className="text-small text-[var(--text-secondary)]">Gestão de eventos e ingressos</p>
        </div>

        {/* Card de login */}
        <Card className="w-full max-w-[400px] border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-lg shadow-black/5 rounded-xl">
          <CardContent className="p-6">
            <h2 className="mb-5 text-center text-xl font-semibold text-[var(--text-primary)]">
              Entrar na sua conta
            </h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-small font-medium text-[var(--text-primary)]">
                        E-mail
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="seu@email.com"
                          type="email"
                          {...field}
                          className="h-11 bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)]"
                        />
                      </FormControl>
                      <FormMessage className="text-small text-[var(--error)]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-small font-medium text-[var(--text-primary)]">
                        Senha
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="••••••••"
                            type={showPassword ? "text" : "password"}
                            {...field}
                            className="h-11 bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)] pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-small text-[var(--error)]" />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-0.5">
                  <Link
                    to="/recuperar-senha"
                    className="text-small text-[var(--accent-text)] hover:text-[var(--accent)] hover:underline transition-colors"
                  >
                    Esqueci minha senha
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold rounded-lg text-body transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Entrar
                </Button>
              </form>
            </Form>

            {/* Link de cadastro destacado */}
            <div className="mt-5 p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-center">
              <p className="text-small text-[var(--text-secondary)] mb-1.5">Não tem uma conta?</p>
              <Link
                to="/cadastro"
                className="text-body font-semibold text-[var(--accent-text)] hover:text-[var(--accent)] hover:underline transition-colors"
              >
                Criar conta
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
