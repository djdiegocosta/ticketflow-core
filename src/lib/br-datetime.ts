/**
 * Conversão explícita entre horário de Brasília (UTC-3, sem horário de
 * verão desde 2019) e UTC — usado em todo campo de data/hora de
 * evento/lote (virada automática, início/fim de lote, data do evento).
 *
 * Por que isso existe: o banco guarda tudo em UTC (timestamptz). Um campo
 * <input type="datetime-local"> não carrega fuso horário nenhum — o valor
 * "2026-09-15T22:00" não diz se é 22h em Brasília, em UTC, ou em qualquer
 * outro lugar. `new Date(string).toISOString()` assume o fuso do
 * navegador/servidor que está rodando o código, o que é inconsistente:
 * funciona por acaso se o dispositivo do admin estiver configurado pra
 * horário de Brasília, e quebra (normalmente 3h de diferença) em qualquer
 * outro caso — inclusive no servidor da Vercel, que roda em UTC por
 * padrão. Esse arquivo faz a conversão sempre explícita, nunca dependendo
 * do fuso de quem está rodando o código.
 */

const BRT_OFFSET_MINUTES = 3 * 60; // Brasília = UTC-3

/** Valor de um <input type="datetime-local"> (horário de Brasília) -> ISO UTC. */
export function brtInputToUtcIso(localValue: string): string | null {
  if (!localValue) return null;
  const [datePart, timePart] = localValue.split("T");
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  if ([y, m, d, h, min].some((n) => Number.isNaN(n))) return null;
  const utcMs = Date.UTC(y, m - 1, d, h, min) + BRT_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/** ISO UTC do banco -> valor pronto para um <input type="datetime-local"> em horário de Brasília. */
export function utcIsoToBrtInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const brtMs = d.getTime() - BRT_OFFSET_MINUTES * 60 * 1000;
  const brt = new Date(brtMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${brt.getUTCFullYear()}-${pad(brt.getUTCMonth() + 1)}-${pad(brt.getUTCDate())}T${pad(brt.getUTCHours())}:${pad(brt.getUTCMinutes())}`;
}

/** ISO UTC -> data+hora formatada em horário de Brasília, independente do fuso de quem está vendo. */
export function formatBrtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** ISO UTC -> só a data, em horário de Brasília. */
export function formatBrtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** ISO UTC -> só o horário, em horário de Brasília. */
export function formatBrtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}
