import { redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { authSnapshots } from './auth-snapshot';

export type GuardRole = 'admin' | 'colaborador' | 'operador_checkin' | 'cliente';

export interface GuardContext {
  userId: string;
  role: GuardRole;
  organizationId: string | null;
  /**
   * Sempre null no guard: o status da organização não é usado por nenhuma
   * rota/tela para decidir acesso e consultá-lo aqui custava uma ida ao
   * servidor a cada navegação. O AuthProvider carrega esse dado depois do
   * primeiro render (ver docs/OTIMIZACAO-CARREGAMENTO.md).
   */
  organizationStatus: string | null;
}

/**
 * Verifica a sessão real do Supabase e o papel do usuário (tabela user_roles).
 * Usar apenas em rotas com `ssr: false`, pois a sessão vive no navegador.
 *
 * Como funciona (ordem importa para a velocidade — ver docs/OTIMIZACAO-CARREGAMENTO.md):
 *  1. getSession(): leitura LOCAL (sem rede) só para saber quem é o usuário.
 *  2. EM PARALELO: validação da sessão no servidor (getUser) + papel/organização
 *     (snapshot compartilhado com o AuthProvider, com cache curto).
 *  3. Se o servidor não confirmar a sessão, descarta tudo e manda para /login.
 *
 * A validação no servidor continua existindo; só não é repetida a cada
 * navegação dentro da janela curta de cache (30s).
 */
export async function requireSession(): Promise<GuardContext> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw redirect({ to: '/login' });
  }
  const userId = session.user.id;

  const [validation, snapshot] = await Promise.all([
    authSnapshots.isValidated(userId) ? Promise.resolve(null) : supabase.auth.getUser(),
    authSnapshots.get(userId),
  ]);

  if (validation) {
    if (validation.error || !validation.data.user || validation.data.user.id !== userId) {
      authSnapshots.clear();
      throw redirect({ to: '/login' });
    }
    authSnapshots.markValidated(userId);
  }

  return {
    userId,
    role: snapshot.role as GuardRole,
    organizationId: snapshot.organizationId,
    organizationStatus: null,
  };
}

export function homeRouteForRole(role: GuardRole): '/admin' | '/checkin' | '/cliente' {
  if (role === 'admin' || role === 'colaborador') return '/admin';
  if (role === 'operador_checkin') return '/checkin';
  return '/cliente';
}
