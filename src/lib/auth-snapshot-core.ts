/**
 * Núcleo do "snapshot de autenticação": papel do usuário + organização.
 *
 * POR QUE EXISTE (ver docs/OTIMIZACAO-CARREGAMENTO.md):
 * antes, AuthProvider, requireSession() (guard das rotas) e a própria rota
 * /cliente consultavam papel/organização cada um por conta própria, em
 * sequência, e o guard repetia tudo a CADA navegação. Aqui existe um único
 * ponto que:
 *   1. busca papel e organização EM PARALELO (não dependem um do outro);
 *   2. junta chamadas simultâneas na mesma consulta (dedupe);
 *   3. guarda o resultado por poucos segundos (TTL) para navegações seguintes;
 *   4. nunca guarda resultado com erro (falha passageira não vira "cliente" fixo).
 *
 * Este arquivo é PURO (não importa o Supabase) para poder ser testado.
 * A ligação com o Supabase está em auth-snapshot.ts.
 *
 * Segurança: isto é só otimização de leitura. Quem autoriza de verdade
 * continua sendo o RLS/RPC do banco em cada consulta.
 */

export interface AuthSnapshot {
  userId: string;
  /** Papel resolvido. Sem papel cadastrado (ou erro) => "cliente". */
  role: string;
  organizationId: string | null;
  /** true se a consulta de papel OU de organização falhou (mesmo após retry). */
  hadError: boolean;
}

interface QueryResult<T> {
  data: T;
  error: unknown;
}

export interface AuthSnapshotDeps {
  fetchRole: (userId: string) => Promise<QueryResult<string | null>>;
  fetchOrganization: () => Promise<QueryResult<string | null>>;
  /** Por quanto tempo um snapshot sem erro é reaproveitado. Padrão 30s. */
  ttlMs?: number;
  /** Espera antes do único retry em caso de erro. Padrão 600ms (mesmo valor de antes). */
  retryDelayMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface AuthSnapshotStore {
  get: (userId: string, opts?: { force?: boolean | undefined }) => Promise<AuthSnapshot>;
  clear: () => void;
  /** A sessão deste usuário foi validada no servidor há pouco tempo? */
  isValidated: (userId: string) => boolean;
  markValidated: (userId: string) => void;
}

export function createAuthSnapshotStore(deps: AuthSnapshotDeps): AuthSnapshotStore {
  const ttlMs = deps.ttlMs ?? 30_000;
  const retryDelayMs = deps.retryDelayMs ?? 600;
  const now = deps.now ?? (() => Date.now());
  const sleep =
    deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let cached: { snapshot: AuthSnapshot; at: number } | null = null;
  let inflight: { userId: string; promise: Promise<AuthSnapshot> } | null = null;
  let validated: { userId: string; at: number } | null = null;
  // Incrementa em clear(): uma consulta que já estava em andamento quando o
  // usuário saiu não pode repopular o cache depois.
  let generation = 0;

  async function withRetry<T>(run: () => Promise<QueryResult<T>>): Promise<QueryResult<T>> {
    let result = await run();
    if (result.error) {
      await sleep(retryDelayMs);
      result = await run();
    }
    return result;
  }

  async function load(userId: string): Promise<AuthSnapshot> {
    const startedIn = generation;
    // Papel e organização são independentes: uma ida ao servidor, não duas.
    const [roleResult, orgResult] = await Promise.all([
      withRetry(() => deps.fetchRole(userId)),
      withRetry(() => deps.fetchOrganization()),
    ]);

    const snapshot: AuthSnapshot = {
      userId,
      role: roleResult.data ?? "cliente",
      organizationId: orgResult.data || null,
      hadError: Boolean(roleResult.error || orgResult.error),
    };

    if (!snapshot.hadError && startedIn === generation) {
      cached = { snapshot, at: now() };
    }
    return snapshot;
  }

  return {
    get(userId, opts) {
      if (
        !opts?.force &&
        cached &&
        cached.snapshot.userId === userId &&
        now() - cached.at < ttlMs
      ) {
        return Promise.resolve(cached.snapshot);
      }
      if (inflight && inflight.userId === userId && !opts?.force) {
        return inflight.promise;
      }
      const promise = load(userId).finally(() => {
        if (inflight?.promise === promise) inflight = null;
      });
      inflight = { userId, promise };
      return promise;
    },

    clear() {
      generation += 1;
      cached = null;
      inflight = null;
      validated = null;
    },

    isValidated(userId) {
      return Boolean(validated && validated.userId === userId && now() - validated.at < ttlMs);
    },

    markValidated(userId) {
      validated = { userId, at: now() };
    },
  };
}
