import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { RoutePending } from "@/components/RoutePending";

// Componente interno que valida papel antes de renderizar children
function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (userRole === "operador_checkin") {
      navigate({ to: "/checkin", replace: true });
    } else if (userRole === "cliente") {
      navigate({ to: "/cliente", replace: true });
    }
  }, [userRole, loading, navigate]);

  // Antes: `return null` (tela branca) enquanto a autenticação carregava.
  if (loading) return <RoutePending />;
  if (userRole === "operador_checkin" || userRole === "cliente") return <RoutePending />;

  return <>{children}</>;
}

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: function AdminRoute() {
    return (
      <AdminRouteGuard>
        <AdminLayout />
      </AdminRouteGuard>
    );
  },
});
