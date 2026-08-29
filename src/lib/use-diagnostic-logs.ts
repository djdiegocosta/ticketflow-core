// ============================================================
// DEBUG MODE — desliga TODO o sistema de diagnóstico removendo este arquivo
// e o link em admin.ferramentas.index.tsx
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DiagnosticLogs } from "@/integrations/supabase/types";

export type DiagnosticEntry = DiagnosticLogs;

// ── Storage key para o toggle global ─────────────────────────
const DEBUG_MODE_KEY = "ticketflow_debug_mode";

// ── Traduções português ──────────────────────────────────────
const ERROR_TRANSLATIONS: Record<string, string> = {
  // Supabase / auth
  "invalid_grant": "Credenciais inválidas (e-mail/senha incorretos).",
  "user_already_exists": "Este e-mail já está cadastrado.",
  "invalid_email": "Formato de e-mail inválido.",
  "weak_password": "Senha muito fraca. Use pelo menos 8 caracteres.",
  "session_expired": "Sessão expirada. Faça login novamente.",
  "not_found": "Registro não encontrado no banco de dados.",
  "PGRST204": "Coluna não encontrada. Verifique o nome no schema.",
  "PGRST116": "Nenhuma linha retornada. O .single() falhou porque veio 0 ou 2+ linhas.",
  "23505": "Violação de chave única — registro duplicado.",
  "23503": "Violação de chave estrangeira — referência a registro que não existe.",
  "23514": "Violação de restrição CHECK — valor fora do permitido.",
  "42501": "Sem permissão para esta operação (erro RLS ou GRANT).",
  "42P01": "Tabela não existe. Verifique o nome ou o schema.",
  "406": "Consulta retornou 0 linhas — .single() esperava exatamente 1.",
  "406 NOT ACCEPTABLE": "RPC ou query esperava 1 resultado mas veio vazio.",

  // HTTP / fetch
  "401": "Não autenticado. Faça login novamente.",
  "403": "Acesso negado. Você não tem permissão para esta ação.",
  "404": "Recurso não encontrado.",
  "422": "Dados inválidos enviados ao servidor.",
  "429": "Muitas requisições. Tente novamente em alguns minutos.",
  "500": "Erro interno do servidor. Tente novamente mais tarde.",
  "ERR_NETWORK": "Sem conexão com a internet ou servidor offline.",
  "Failed to fetch": "Falha ao conectar com o servidor. Verifique sua internet.",
  "Network request failed": "Requisição de rede falhou. Servidor indisponível.",

  // Mercado Pago
  "mp_payment_not_found": "Pagamento não encontrado no Mercado Pago.",
  "mp_webhook_failed": "Webhook do Mercado Pago falhou ao processar pagamento.",
  "mp_expired_qr": "QR Code Pix expirou. A venda precisa ser cancelada.",
  "invalid_mp_token": "Token do Mercado Pago inválido ou expirado.",

  // TicketFlow app
  "sale_expired": "Venda pendente expirou e foi cancelada automaticamente.",
  "ticket_already_checked_in": "Este ingresso já foi utilizado no check-in.",
  "customer_not_found": "Cliente não encontrado. Verifique se o cadastro foi concluído.",
  "organization_not_configured": "Organização não configurada. Acesse Configurações.",
  "event_closed": "Este evento está encerrado e não aceita mais operações.",
};

function translateError(errorCode: string, errorMessage: string): string {
  if (ERROR_TRANSLATIONS[errorCode]) return ERROR_TRANSLATIONS[errorCode];
  for (const [key, translation] of Object.entries(ERROR_TRANSLATIONS)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }
  return "Causa não identificada. Verifique o erro técnico abaixo.";
}

// ── Singleton de debounce para não floodar inserts ──────────
let pendingLog: {
  route: string;
  operation: string;
  errorCode: string;
  errorMessage: string;
  likelyCause: string;
  context: Record<string, unknown>;
} | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    if (!pendingLog) return;
    const entry = pendingLog;
    pendingLog = null;
    try {
      await supabase.from("diagnostic_logs").insert(entry);
    } catch {
      // Silencioso — nunca quebrar fluxo por causa do log
    }
  }, 500);
}

// ── Hook principal ──────────────────────────────────────────
export function useDiagnosticLogs() {
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DEBUG_MODE_KEY) === "true";
  });
  const [logs, setLogs] = useState<DiagnosticEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const toggleDebug = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem(DEBUG_MODE_KEY, String(enabled));
    }
  }, []);

  const logError = useCallback(
    (params: {
      route: string;
      operation: string;
      errorCode: string;
      errorMessage: string;
      context?: Record<string, unknown>;
    }) => {
      if (!isEnabled) return;

      const likelyCause = translateError(params.errorCode, params.errorMessage);

      pendingLog = {
        route: params.route,
        operation: params.operation,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
        likelyCause,
        context: params.context ?? {},
      };
      scheduleFlush();
    },
    [isEnabled],
  );

  const fetchLogs = useCallback(async () => {
    if (!isEnabled) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("diagnostic_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("[DiagnosticLogs] fetch error:", error);
        return;
      }
      setLogs((data as DiagnosticEntry[]) ?? []);
    } finally {
      setIsFetching(false);
    }
  }, [isEnabled]);

  const clearLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.from("diagnostic_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const translate = useCallback(
    (errorCode: string, errorMessage: string) => translateError(errorCode, errorMessage),
    [],
  );

  useEffect(() => {
    if (isEnabled) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 30_000);
      return () => clearInterval(interval);
    }
  }, [isEnabled, fetchLogs]);

  return {
    isEnabled,
    toggleDebug,
    logError,
    logs,
    isLoading,
    isFetching,
    fetchLogs,
    clearLogs,
    translate,
  };
}

export function DiagnosticErrorBoundary({
  children,
  logError,
}: {
  children: React.ReactNode;
  logError?: ReturnType<typeof useDiagnosticLogs>["logError"];
}) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!logError) return;

    const handler = (event: ErrorEvent) => {
      logError({
        route: window.location.pathname,
        operation: "window.onerror",
        errorCode: "UNCAUGHT",
        errorMessage: event.message ?? "Erro não tratado",
        context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
      });
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      logError({
        route: window.location.pathname,
        operation: "unhandledrejection",
        errorCode: "UNHANDLED_REJECTION",
        errorMessage: String(event.reason ?? "Promise rejeitada"),
      });
    };

    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, [logError]);

  if (hasError && error) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--error)]">Erro capturado pelo DiagnosticErrorBoundary.</p>
        <pre className="mt-2 text-left text-xs overflow-auto max-h-40">
          {String(error)}
        </pre>
      </div>
    );
  }

  return <>{children}</>;
}
