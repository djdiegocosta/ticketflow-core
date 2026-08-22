import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const LOGIN_BACKGROUND_URL = "/images/background_login.png";

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
      // A navegação acontece após o splash (useEffect acima)
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
        // Redirecionamento automático gerenciado pelo helper
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
      <div className="relative flex flex-col items-center justify-center p-4 py-12 min-h-screen">
        <div 
          className="absolute inset-0 -z-10 bg-cover bg-center grayscale" 
          style={{ backgroundImage: `url(${LOGIN_BACKGROUND_URL})` }}
        />
        <div className="absolute inset-0 -z-10 bg-[var(--bg-primary)]/85" />
        <div className="mb-8 flex items-center gap-2">
          <Ticket className="h-8 w-8 text-accent" />
          <h1 className="text-display text-accent font-bold">TicketFlow</h1>
        </div>

        <Card className="w-full max-w-[400px] bg-bg-secondary border-border-default shadow-md rounded-lg">
        <CardHeader className="pb-2">
          <h2 className="text-heading-1 text-center">Entrar</h2>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <div className="flex justify-end">
                <Link
                  to="/recuperar-senha"
                  className="text-small text-accent-text hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent-hover text-[#111111] font-semibold rounded-md"
              >
                Entrar
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border-default"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-bg-secondary px-2 text-text-secondary">Ou continue com</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full border-border-default hover:bg-bg-secondary text-text-primary flex items-center justify-center gap-2 rounded-md"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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

              <div className="text-center mt-4">
                <span className="text-small text-text-secondary">
                  Não tem uma conta?{" "}
                </span>
                <Link
                  to="/cadastro"
                  className="text-small text-accent-text font-semibold hover:underline"
                >
                  Criar conta
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
        </Card>
      </div>
    </MobileLayout>
    </>
  );
}
