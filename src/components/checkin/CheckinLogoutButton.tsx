import { useState } from "react";
import { LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

interface CheckinLogoutButtonProps {
  /** "icon": botão discreto do cabeçalho da câmera. "text": botão com texto, para telas sem cabeçalho. */
  variant?: "icon" | "text";
  /** Check-ins feitos sem internet que ainda não foram enviados. */
  pendingSyncCount?: number;
}

/**
 * Botão de sair da área de check-in. Pede confirmação para ninguém sair sem
 * querer no meio da entrada e avisa se há check-ins ainda não enviados.
 */
export function CheckinLogoutButton({ variant = "icon", pendingSyncCount = 0 }: CheckinLogoutButtonProps) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
    } catch {
      // Sem internet o encerramento no servidor pode falhar: limpa a sessão só
      // deste aparelho para o operador nunca ficar preso na tela.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      window.location.assign("/login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Sair da conta"
          title="Sair da conta"
          className="p-2 text-white/50 transition-colors hover:text-white"
        >
          <LogOut className="h-5 w-5" />
        </button>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair da conta
        </Button>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSyncCount > 0
                ? `Há ${pendingSyncCount} ${pendingSyncCount === 1 ? "check-in" : "check-ins"} feito${pendingSyncCount === 1 ? "" : "s"} sem internet que ainda não ${pendingSyncCount === 1 ? "foi enviado" : "foram enviados"}. Conecte-se à internet antes de sair para não atrasar o envio.`
                : "Você precisará entrar de novo para continuar o check-in."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Continuar no check-in</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void handleLogout();
              }}
            >
              {busy ? "Saindo..." : "Sair"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
