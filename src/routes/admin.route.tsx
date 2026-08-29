import { createFileRoute, redirect } from "@tanstack/react-router";
import { Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";

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

  if (loading) return null;
  if (userRole === "operador_checkin" || userRole === "cliente") return null;

  return <>{children}</>;
}

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: function AdminRoute() {
    const matchRoute = useMatchRoute();
    const isThisRoute = matchRoute({ to: "/admin" });

    // Apenas o segmento /admin exato monta o layout completo.
    // Sub-rotas (filhas) são renderizadas dentro do Outlet do AdminLayout.
    if (!isThisRoute) {
      return <Outlet />;
    }

    return (
      <AdminRouteGuard>
        <AdminLayout />
      </AdminRouteGuard>
    );
  },
});
