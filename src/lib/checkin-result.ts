// Interpretação do resultado do check-in e textos do alerta em tela cheia.
// Lógica pura (sem rede nem tela) para poder ser testada.

export type CheckinStatus = "valid" | "already_used" | "past_event" | "invalid";

/** Linha devolvida pela função checkin_ticket_for_event do banco. */
export interface CheckinRpcRow {
  result: string;
  participant_name: string | null;
  event_title: string | null;
  checked_in_at: string | null;
}

export interface CheckinOutcome {
  status: CheckinStatus;
  name: string;
  eventName: string;
  /** Informação extra para o alerta: hora do primeiro uso ou evento de origem. */
  detail?: string | undefined;
}

function formatTime(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function interpretCheckinRow(row: CheckinRpcRow, code: string, currentEventName: string): CheckinOutcome {
  const name = row.participant_name || code;
  switch (row.result) {
    case "sucesso":
      return { status: "valid", name, eventName: row.event_title || currentEventName };
    case "duplicidade":
      return { status: "already_used", name, eventName: row.event_title || currentEventName, detail: formatTime(row.checked_in_at) };
    case "evento_passado":
      // Aqui event_title é o evento ao qual o ingresso pertence, não o evento atual.
      return { status: "past_event", name, eventName: currentEventName, detail: row.event_title || undefined };
    default:
      return { status: "invalid", name, eventName: row.event_title || currentEventName };
  }
}

export interface OverlayText {
  title: string;
  subtitle?: string;
}

export function overlayText(status: CheckinStatus, name: string, detail?: string): OverlayText {
  switch (status) {
    case "valid":
      return { title: name };
    case "already_used":
      return { title: "INGRESSO JÁ UTILIZADO", subtitle: [name, detail ? `Utilizado às ${detail}` : null].filter(Boolean).join(" · ") };
    case "past_event":
      return { title: "INGRESSO DE EVENTO PASSADO", subtitle: [name, detail ? `Evento: ${detail}` : null].filter(Boolean).join(" · ") };
    default:
      return { title: "Ingresso inválido" };
  }
}

/** Padrão de vibração do aparelho para chamar a atenção do operador. */
export function vibrationFor(status: CheckinStatus): number[] | null {
  switch (status) {
    case "already_used":
    case "past_event":
      return [250, 120, 250];
    case "invalid":
      return [400];
    default:
      return null;
  }
}
