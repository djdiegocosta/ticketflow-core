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
    .select('role')
    .eq('user_id', data.user.id)
    .limit(1)
    .maybeSingle();

  const { data: organizationId } = await supabase.rpc('get_single_organization_id');

  let organizationStatus: string | null = null;
  if (organizationId) {
    const { data: organization } = await supabase
      .from('organizations')
      .select('status')
      .eq('id', organizationId)
      .maybeSingle();
    organizationStatus = organization?.status ?? null;
  }

  return {
    userId: data.user.id,
    role: (roleRow?.role as GuardRole) ?? 'cliente',
    organizationId: organizationId ?? null,
    organizationStatus,
  };
}

export function homeRouteForRole(role: GuardRole): '/admin' | '/checkin' | '/cliente' {
  if (role === 'admin' || role === 'colaborador') return '/admin';
  if (role === 'operador_checkin') return '/checkin';
  return '/cliente';
}
