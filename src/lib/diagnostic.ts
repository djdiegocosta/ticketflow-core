import { supabase } from "@/integrations/supabase/client";

/**
 * Grava um registro em diagnostic_logs para rastrear erros críticos em produção.
 * Falha silenciosamente — nunca deve interromper o fluxo do usuário.
 *
 * @param route    - Rota onde o erro ocorreu (window.location.pathname)
 * @param operation - O que estava sendo feito (ex: "checkout", "checkin", "auth")
 * @param error    - O erro capturado (Error, string, ou qualquer objeto)
 * @param context  - Dados adicionais opcionais para diagnóstico
 */
export async function logDiagnosticError(
  route: string,
  operation: string,
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    const errorCode =
      error instanceof Error
        ? error.name
        : typeof error === "string"
          ? "StringError"
          : "UnknownError";

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);

    // Tenta obter o usuário logado (pode falhar em contexto público — ok)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("diagnostic_logs").insert({
      route,
      operation,
      error_code: errorCode,
      error_message: errorMessage,
      likely_cause: buildLikelyCause(error),
      context: context
        ? context
        : error instanceof Error && error.stack
          ? { stack: error.stack.slice(0, 1500) }
          : null,
      user_id: user?.id ?? null,
      // organization_id null é aceito pela tabela — INSERT policy não exige
    });
  } catch {
    // Silencioso — o diagnóstico nunca deve quebrar a app
  }
}

function buildLikelyCause(error: unknown): string {
  if (!(error instanceof Error)) return "Erro não tipado";
  const msg = error.message.toLowerCase();
  if (msg.includes("network") || msg.includes("fetch")) return "Falha de rede ou Supabase indisponível";
  if (msg.includes("jwt") || msg.includes("auth") || msg.includes("session")) return "Sessão expirada ou token inválido";
  if (msg.includes("permission") || msg.includes("rls") || msg.includes("policy")) return "Erro de permissão (RLS)";
  if (msg.includes("null") || msg.includes("undefined")) return "Dado nulo ou indefinido inesperado";
  if (msg.includes("chunk") || msg.includes("loading")) return "Falha ao carregar módulo (chunk error)";
  return "Erro de aplicação não categorizado";
}
