import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const { login, isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && userRole === 'admin') {
      navigate({ to: '/admin' });
    }
  }, [isAuthenticated, userRole, navigate]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "all",
  });

  const onSubmit = (data: LoginFormValues) => {
    const success = login(data.email, data.password);
    if (success) {
      toast.success("Login realizado com sucesso!");
      navigate({ to: '/admin' });
    } else {
      form.setError("password", { message: "E-mail ou senha incorretos" });
    }
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary p-4">
      <div className="mb-8">
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
                disabled={form.formState.isSubmitting}
              >
                Entrar
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
  );
}
