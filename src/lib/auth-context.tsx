import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole } from "@/integrations/supabase/types";

const supabase = createClient();

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  userRole: AppRole | null;
  userName: string | null;
  organizationId: string | null;
  organizationStatus: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationStatus, setOrganizationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Evita execução concorrente de loadContext
  const loadingRef = useRef(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const loadContext = useCallback(async (currentSession: Session | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      if (!currentSession?.user) {
        setUser(null);
        setUserRole(null);
        setUserName(null);
        setOrganizationId(null);
        setOrganizationStatus(null);
        setLoading(false);
        return;
      }

      const userId = currentSession.user.id;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, organization_id, organizations(status)")
        .eq("user_id", userId)
        .maybeSingle();

      const role: AppRole = roleData?.role ?? "cliente";
      const orgId: string | null = roleData?.organization_id ?? null;
      const orgStatus: string | null =
        (roleData?.organizations as any)?.status ?? null;

      const profile = currentSession.user.user_metadata;
      const name: string | null = profile?.full_name ?? null;

      setUser(currentSession.user);
      setUserRole(role);
      setUserName(name ?? null);
      setOrganizationId(orgId);
      setOrganizationStatus(orgStatus);
      setSession(currentSession);

      // Navegação por papel — após contexto carregado
      if (role === "operador_checkin") {
        navigate({ to: "/checkin", replace: true });
      } else if (role === "admin" || role === "colaborador") {
        navigate({ to: "/admin", replace: true });
      } else {
        navigate({ to: "/cliente", replace: true });
      }
    } catch (err) {
      console.error("[AuthContext] loadContext error:", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [navigate]);

  // Apenas UM listener — é o único ponto que atualiza sessão e carrega contexto
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      loadContext(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Só reagenda se já não estiver rodando
      if (loadingRef.current) return;
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        loadContext(newSession);
      }, 50);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeoutRef.current);
    };
  }, [loadContext]);

  // login() NÃO executa mais loadContext nem setSession —
  // o onAuthStateChange é quem dispara tudo após a autenticação
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch {
      return { error: "Erro inesperado ao fazer login." };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUserName(null);
    setOrganizationId(null);
    setOrganizationStatus(null);
    navigate({ to: "/login", replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userRole,
        userName,
        organizationId,
        organizationStatus,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
