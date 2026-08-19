import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'colaborador' | 'operador_checkin' | 'cliente' | null;

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  userName: string;
  organizationId: string | null;
  organizationStatus: string | null;
  isSplashComplete: boolean;
  setSplashComplete: (complete: boolean) => void;
  login: (email: string, pass: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationStatus, setOrganizationStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSplashComplete, setIsSplashComplete] = useState<boolean>(true); // Por padrão, splash já completo para evitar bloqueio visual se não necessário
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loadContext = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUserRole(null);
      setUserName('');
      setOrganizationId(null);
      setOrganizationStatus(null);
      return;
    }

    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase
        .from('user_roles')
        .select('role, organization_id, organizations!inner(status)')
        .eq('user_id', currentUser.id)
        .limit(1)
        .maybeSingle(),
      supabase.from('profiles').select('full_name').eq('id', currentUser.id).maybeSingle(),
    ]);

    setUserRole((roleRow?.role as UserRole) ?? 'cliente');
    setOrganizationId(roleRow?.organization_id ?? null);
    setOrganizationStatus((roleRow?.organizations as any)?.status ?? null);
    setUserName(
      profile?.full_name ||
        (currentUser.user_metadata?.['full_name'] as string | undefined) ||
        currentUser.email ||
        '',
    );
  }, []);

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        
        const currentSession = data.session;
        setSession(currentSession);
        
        if (currentSession?.user) {
          await loadContext(currentSession.user);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return;

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSession(newSession);
        await loadContext(newSession?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserRole(null);
        setUserName('');
        setOrganizationId(null);
        setOrganizationStatus(null);
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(newSession);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadContext]);

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      return { error: error.message };
    }
    setSession(data.session);
    await loadContext(data.user);
    setIsSplashComplete(false);
    return { error: null };
  };

  const logout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
    setUserName('');
    setOrganizationId(null);
    setOrganizationStatus(null);
    navigate({ to: '/login', replace: true });
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getUser();
    await loadContext(data.user ?? null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: Boolean(session?.user),
        user: session?.user ?? null,
        session,
        userRole,
        userName,
        organizationId,
        organizationStatus,
        isSplashComplete,
        setSplashComplete: setIsSplashComplete,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
