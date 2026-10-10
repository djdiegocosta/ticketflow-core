import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { MobileLayout } from "@/components/layouts/MobileLayout";
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

const resetSchema = z
  .object({
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação de senha obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  // "checking": verificando o link; "ok": link válido; "invalid": link vencido ou já usado
  const [linkStatus, setLinkStatus] = useState<"checking" | "ok" | "invalid">("checking");

  useEffect(() => {
    // O Supabase avisa link vencido/usado no próprio endereço (#error=...)
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("error=") || hash.includes("error_code=")) {
      setLinkStatus("invalid");
      return;
    }
    let done = false;
    const markOk = () => {
      done = true;
      setLinkStatus("ok");
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) markOk();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markOk();
    });
    // Se em alguns segundos não houver sessão, o link não é válido
    const timer = setTimeout(() => {
      if (!done) setLinkStatus("invalid");
    }, 4000);
    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: ResetFormValues) => {
    const { error } = await supabase.auth.updateUser({ password: data.password });

    if (error) {
      form.setError("password", { message: error.message });
      return;
    }

    toast.success("Senha redefinida com sucesso!");
    navigate({ to: "/login" });
  };

  if (linkStatus === "checking") {
    return (
      <MobileLayout showFooter={false}>
        <div className="flex flex-col items-center justify-center p-4 py-12">
          <p className="text-small text-text-secondary">Verificando seu link...</p>
        </div>
      </MobileLayout>
    );
  }

  if (linkStatus === "invalid") {
    return (
      <MobileLayout showFooter={false}>
        <div className="flex flex-col items-center justify-center p-4 py-12">
          <Card className="w-full max-w-[400px] bg-bg-secondary border-border-default shadow-md rounded-lg">
            <CardHeader className="pb-2 text-center">
              <h2 className="text-heading-1">Link vencido ou já usado</h2>
              <p className="text-small text-text-secondary mt-2">
                Por segurança, o link de redefinição vale por pouco tempo e só pode ser usado uma vez. Peça um novo para continuar.
              </p>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-accent hover:bg-accent-hover text-[#111111] font-semibold rounded-md mt-2">
                <Link to="/recuperar-senha">Pedir novo link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showFooter={false}>
      <div className="flex flex-col items-center justify-center p-4 py-12">
        <Card className="w-full max-w-[400px] bg-bg-secondary border-border-default shadow-md rounded-lg">
          <CardHeader className="pb-2 text-center">
            <h2 className="text-heading-1">Redefinir senha</h2>
            <p className="text-small text-text-secondary mt-2">
              Crie uma nova senha para sua conta.
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova senha</FormLabel>
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
                      <FormLabel>Confirmar nova senha</FormLabel>
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
                  Redefinir senha
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
