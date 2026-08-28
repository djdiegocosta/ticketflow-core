import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { lovable } from "@/integrations/lovable/index";
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
  const { login, isAuthenticated, userRole, userName, isSplashComplete, setSplashComplete, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && isSplashComplete) {
      if (userRole === 'admin' || userRole === 'colaborador') {
        navigate({ to: '/admin', replace: true });
      } else if (userRole === 'cliente') {
        navigate({ to: '/cliente', replace: true });
      } else if (userRole === 'operador_checkin') {
        navigate({ to: '/checkin', replace: true });
      }
    }
  }, [isLoading, isAuthenticated, userRole, isSplashComplete, navigate]);

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
        message:
          error.toLowerCase().includes("invalid")
            ? "E-mail ou senha incorretos"
            : error,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error("Erro ao entrar com Google: " + result.error.message);
        return;
      }

      if (result.redirected) {
        return;
      }
    } catch (error: any) {
      toast.error("Erro inesperado no login social");
      console.error(error);
    }
  };

  return (
    <>
      {isAuthenticated && !isSplashComplete && (
        <WelcomeSplash 
          userName={userName} 
          onComplete={() => setSplashComplete(true)} 
        />
      )}
      <MobileLayout showFooter={false}>
        <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-12">
          {/* Background decorativo */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-primary)] to-[var(--bg-secondary)]" />
          <div className="absolute inset-0 -z-10 opacity-30">
            <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[var(--accent)]/5 blur-3xl" />
          </div>

          {/* Logo */}
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
              <Ticket className="h-5 w-5 text-[var(--accent-text)]" />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight text-[var(--text-primary)]">TicketFlow</h1>
              <p className="text-small text-[var(--text-secondary)]">Gestão de eventos e ingressos</p>
            </div>
          </div>

          {/* Card de login */}
          <Card className="w-full max-w-[400px] border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-lg shadow-black/5 rounded-xl">
            <CardContent className="p-6">
              <h2 className="mb-5 text-center text-xl font-semibold text-[var(--text-primary)]">Entrar na sua conta</h2>
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

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[var(--border-subtle)]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[var(--bg-primary)] px-3 text-small text-[var(--text-secondary)]">
                        Ou continue com
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    className="h-11 w-full border-[var(--border-default)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] text-body font-medium rounded-lg transition-all duration-200"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </Button>

                  <div className="text-center pt-1">
                    <span className="text-small text-[var(--text-secondary)]">
                      Não tem uma conta?{" "}
                    </span>
                    <Link
                      to="/cadastro"
                      className="text-small font-semibold text-[var(--accent-text)] hover:text-[var(--accent)] hover:underline transition-colors"
                    >
                      Criar conta
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Footer discreto */}
          <p className="mt-6 text-micro text-[var(--text-disabled)]">
            © {new Date().getFullYear()} TicketFlow — Todos os direitos reservados
          </p>
        </div>
      </MobileLayout>
    </>
  );
}
