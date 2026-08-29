import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Terminal,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useDiagnosticLogs } from "@/lib/use-diagnostic-logs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "agora mesmo";
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return `${Math.floor(diff / 86400)}d atrás`;
  } catch {
    return dateStr;
  }
}

export default function DiagnosticLogsPage() {
  const navigate = useNavigate();

  const {
    isEnabled,
    toggleDebug,
    logs,
    isLoading,
    isFetching,
    fetchLogs,
    clearLogs,
    translate,
  } = useDiagnosticLogs();

  useEffect(() => {
    if (!isEnabled) {
      navigate({ to: "/admin/ferramentas" });
    }
  }, [isEnabled, navigate]);

  if (!isEnabled) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-none border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
            <Terminal className="h-5 w-5 text-[var(--accent-text)]" />
          </div>
          <div>
            <h1 className="text-heading-1 text-[var(--text-primary)]">Log de Diagnóstico</h1>
            <p className="text-body text-[var(--text-secondary)]">
              Erros capturados no TicketFlow — traduzidos para português.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-[var(--accent-text)]" />
            <span className="text-body text-[var(--text-primary)] font-medium">Captura ativa</span>
            <Switch checked={isEnabled} onCheckedChange={toggleDebug} />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
            disabled={isLoading || logs.length === 0}
            className="gap-2 text-[var(--error)] border-[var(--error)]/30 hover:bg-[var(--error)]/10"
          >
            <Trash2 className="h-4 w-4" />
            Limpar tudo
          </Button>
        </div>
      </div>

      {/* Info card */}
      <div className="flex items-start gap-3 rounded-none border border-[var(--border-subtle)] bg-[var(--accent-muted)] p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" />
        <div className="text-body text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Modo diagnóstico ativo.</strong>{" "}
          Desative o interruptor acima para desligar a captura de erros. Para remover
          completamente este sistema, delete{" "}
          <code className="rounded-none bg-black/20 px-1">src/lib/use-diagnostic-logs.ts</code>{" "}
          e o link em Ferramentas.
        </div>
      </div>

      {/* Table */}
      <Card className="rounded-none border-[var(--border-subtle)]">
        <CardHeader className="border-b border-[var(--border-subtle)] pb-4">
          <CardTitle className="text-heading-2 text-[var(--text-primary)]">
            {logs.length === 0 ? "Nenhum erro registrado" : `${logs.length} erro(s) capturado(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <CheckCircle2 className="h-10 w-10 text-[var(--accent)]" />
              <p className="text-body text-[var(--text-secondary)]">
                Nenhum erro registrado até agora. Ótimo sinal!
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--border-subtle)]">
                    <TableHead className="w-44">Quando</TableHead>
                    <TableHead className="w-40">Rota</TableHead>
                    <TableHead className="w-40">Operação</TableHead>
                    <TableHead className="w-28">Código</TableHead>
                    <TableHead>Causa provável</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-[var(--border-subtle)]">
                      <TableCell className="text-body text-[var(--text-secondary)]">
                        {formatTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <code className="rounded-none bg-black/10 px-1.5 py-0.5 text-xs text-[var(--text-primary)]">
                          {log.route}
                        </code>
                      </TableCell>
                      <TableCell className="text-body text-[var(--text-primary)]">
                        {log.operation}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="rounded-none border-[var(--error)]/40 text-[var(--error)] bg-[var(--error)]/5"
                        >
                          {log.error_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-body text-[var(--text-secondary)]">
                        {translate(log.error_code, log.error_message)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            console.group(`[Diagnostic] ${log.operation} @ ${log.route}`);
                            console.log("Código:", log.error_code);
                            console.log("Mensagem:", log.error_message);
                            console.log("Causa:", log.likely_cause);
                            console.log("Contexto:", log.context);
                            console.groupEnd();
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhes do último erro */}
      {logs.length > 0 && (
        <Card className="rounded-none border-[var(--border-subtle)]">
          <CardHeader className="border-b border-[var(--border-subtle)] pb-4">
            <CardTitle className="text-heading-2 text-[var(--text-primary)]">
              Último erro — detalhes técnicos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {(() => {
              const last = logs[0];
              return (
                <div className="space-y-3 text-body">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[var(--text-secondary)]">Código: </span>
                      <span className="font-mono text-[var(--error)]">{last.error_code}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Operação: </span>
                      <span>{last.operation}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Rota: </span>
                      <code className="rounded-none bg-black/10 px-1">{last.route}</code>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Horário: </span>
                      <span>{new Date(last.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[var(--text-secondary)]">Mensagem técnica: </span>
                    <pre className="mt-1 max-h-24 overflow-auto rounded-none border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 text-xs text-[var(--text-primary)]">
                      {last.error_message}
                    </pre>
                  </div>

                  {last.context && Object.keys(last.context).length > 0 && (
                    <div>
                      <span className="text-[var(--text-secondary)]">Contexto: </span>
                      <pre className="mt-1 max-h-24 overflow-auto rounded-none border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 text-xs text-[var(--text-primary)]">
                        {JSON.stringify(last.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
