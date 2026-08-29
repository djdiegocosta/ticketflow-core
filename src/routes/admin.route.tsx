import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts/AdminLayout";

// Rota pai /admin — montagem direta do layout.
// Validação de sessão e papel fica por conta do AuthContext:
// se não estiver logado, onAuthStateChange cuida do redirect.
// Este beforeLoad só trata redirecionamentos internos ao papel.
export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const role = (context as any).auth?.role;
    if (role === "operador_checkin") {
      throw redirect({ to: "/checkin" });
    }
    if (role === "cliente") {
      throw redirect({ to: "/cliente" });
    }
  },
  component: AdminLayout,
});
