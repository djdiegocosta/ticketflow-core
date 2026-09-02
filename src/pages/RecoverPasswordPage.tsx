import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const recoverSchema = z.object({
  email: z.string().email("E-mail inválido").min(1, "E-mail obrigatório"),
});

type RecoverFormValues = z.infer<typeof recoverSchema>;

export default function RecoverPasswordPage() {
  const form = useForm<RecoverFormValues>({
    resolver: zodResolver(recoverSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: RecoverFormValues) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      form.setError("email", { message: error.message });
      return;
    }

    toast.success("Enviamos o link de recuperação para seu e-mail.");
    form.reset();
  };

  return (
    <MobileLayout showFooter={false}>
      <div className="flex flex-col items-center justify-center p-4 py-12">
        <Card className="w-full max-w-[400px] bg-bg-secondary border-border-default shadow-md rounded-lg">
          <CardHeader className="pb-2 text-center">
            <h2 className="text-heading-1">Recuperar senha</h2>
            <p className="text-small text-text-secondary mt-2">
              Informe seu e-mail para receber o link de recuperação.
            </p>
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

                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent-hover text-[#111111] font-semibold rounded-md"
                  disabled={!form.formState.isValid}
                >
                  Enviar link de recuperação
                </Button>

                <div className="text-center mt-4">
                  <Link
                    to="/login"
                    className="text-small text-accent-text font-semibold hover:underline"
                  >
                    Voltar para o login
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
