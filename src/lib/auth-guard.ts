import { redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export type GuardRole = 'admin' | 'colaborador' | 'operador_checkin' | 'cliente';

export interface GuardContext {
  userId: string;
  role: GuardRole;
  organizationId: string | null;
  organizationStatus: string | null;
}

/**
 * Verifica a sessão real do Supabase e o papel do usuário (tabela user_roles).
 * Usar apenas em rotas com `ssr: false`, pois a sessão vive no navegador.
 */
export async function requireSession(): Promise<GuardContext> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: '/login' });
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role, organization_id, organizations!inner(status)')
    .eq('user_id', data.user.id)
    .limit(1)
    .maybeSingle();

  return {
    userId: data.user.id,
    role: (roleRow?.role as GuardRole) ?? 'cliente',
    organizationId: roleRow?.organization_id ?? null,
    organizationStatus: (roleRow?.organizations as any)?.status ?? null,
  };
}

export function homeRouteForRole(role: GuardRole): '/admin' | '/checkin' | '/cliente' {
  if (role === 'admin' || role === 'colaborador') return '/admin';
  if (role === 'operador_checkin') return '/checkin';
  return '/cliente';
}
