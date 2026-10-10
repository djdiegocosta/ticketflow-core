import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { authSnapshots, fetchOrganizationStatus } from "@/lib/auth-snapshot";

type AppRole = Database["public"]["Enums"]["app_role"] | "cliente";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  userRole: AppRole | null;
  userName: string | null;
  organizationId: string | null;
  organizationStatus: string | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Preenchido quando a última tentativa de carregar papel/organização falhou
   * (ex: instabilidade momentânea da sessão). Não é "sem organização" de
   * verdade — é "não consegui confirmar agora". */
  contextError: string | null;
  refreshProfile: () => Promise<void>;
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
  const [contextError, setContextError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Evita execução concorrente de loadContext
  const loadingRef = useRef(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Descarta resposta atrasada do status da organização (troca de usuário/logout no meio).
  const orgStatusRequestRef = useRef(0);

  const loadContext = useCallback(async (currentSession: Session | null, opts?: { force?: boolean }) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      if (!currentSession?.user) {
        setUser(null);
        setUserRole(null);
        setUserName(null);
        setOrganizationId(null);
        setOrganizationStatus(null);
        setContextError(null);
        setSession(null);
        setLoading(false);
        return;
      }

      const userId = currentSession.user.id;

      // Papel (user_roles) e organização (RPC) são independentes: o snapshot
      // busca os dois EM PARALELO, reaproveita o resultado do guard de rota
      // (sem repetir consulta) e mantém o retry único em caso de falha —
      // uma falha passageira NÃO pode virar silenciosamente "cliente" /
      // "sem organização". Ver docs/OTIMIZACAO-CARREGAMENTO.md.
      const snapshot = await authSnapshots.get(userId, { force: opts?.force });
      const role: AppRole = snapshot.role as AppRole;
      const orgId: string | null = snapshot.organizationId;
      setContextError(
        snapshot.hadError ? "Não foi possível confirmar sua sessão agora. Tente novamente em instantes." : null
      );

      // Status da organização NÃO bloqueia o primeiro render (nenhuma tela
      // decide nada com ele no boot): carrega depois, em segundo plano.
      const statusRequest = ++orgStatusRequestRef.current;
      if (!orgId) setOrganizationStatus(null);
      if (orgId) {
        fetchOrganizationStatus(orgId)
          .then((status) => {
            if (orgStatusRequestRef.current === statusRequest) setOrganizationStatus(status);
          })
          .catch(() => {
            // Silencioso: o status é secundário.
          });
      }

      const profile = currentSession.user.user_metadata;
      const name: string | null = (profile as Record<string, unknown> | undefined)?.["full_name"] as string | undefined ?? null;

      setUser(currentSession.user);
      setUserRole(role);
      setUserName(name ?? null);
      setOrganizationId(orgId);
      setSession(currentSession);

      // Navegação por papel — só faz sentido logo após um login de verdade
      // (usuário ainda numa tela de entrada tipo /login, /cadastro ou /).
      // Se a pessoa já está numa página válida pra ela (ex: /admin/vendas),
      // NÃO deve ser movida dali. Sem essa checagem, toda vez que o Supabase
      // revalida a sessão sozinho (isso acontece automaticamente sempre que
      // a aba volta a ficar visível, mesmo sem nenhuma ação da pessoa), o
      // usuário era jogado de volta pro dashboard, perdendo a página em que
      // estava.
      // "/redefinir-senha" NUNCA pode disparar esse redirecionamento: o link
      // de recuperação de senha do e-mail já estabelece uma sessão válida
      // sozinho, e esse mesmo listener via onAuthStateChange tirava a pessoa
      // dessa tela antes de ela conseguir digitar a nova senha.
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      if (currentPath === "/redefinir-senha") {
        return;
      }
      const isEntryPage = ["/", "/login", "/cadastro", "/recuperar-senha"].includes(currentPath);
      const isPublicArea =
        currentPath.startsWith("/e/") ||
        currentPath.startsWith("/meus-ingressos") ||
        currentPath.startsWith("/ingresso/") ||
        currentPath === "/links";
      const alreadyOnOwnArea =
        (role === "operador_checkin" && currentPath.startsWith("/checkin")) ||
        ((role === "admin" || role === "colaborador") && currentPath.startsWith("/admin")) ||
        (role !== "operador_checkin" && role !== "admin" && role !== "colaborador" && currentPath.startsWith("/cliente"));

      if (!isPublicArea && (isEntryPage || !alreadyOnOwnArea)) {
        if (role === "operador_checkin") {
          navigate({ to: "/checkin", replace: true });
        } else if (role === "admin" || role === "colaborador") {
          navigate({ to: "/admin", replace: true });
        } else {
          navigate({ to: "/cliente", replace: true });
        }
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
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT") authSnapshots.clear();
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

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    await loadContext(data.session, { force: true });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    authSnapshots.clear();
    orgStatusRequestRef.current += 1;
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUserName(null);
    setOrganizationId(null);
    setOrganizationStatus(null);
    setContextError(null);
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
        isLoading: loading,
        isAuthenticated: !!session?.user,
        contextError,
        refreshProfile,
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
