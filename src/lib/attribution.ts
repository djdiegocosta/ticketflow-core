/**
 * Atribuição de canal (Links de Venda).
 * Guarda o código do canal (?ref=) em sessionStorage por evento, para que a
 * venda criada no checkout seja contabilizada no canal correto.
 */

const key = (eventId: string) => `tf_ref:${eventId}`;

export function captureRef(eventId: string, ref?: string) {
  if (typeof window === "undefined" || !eventId) return;
  const clean = (ref ?? "").trim();
  if (!clean) return;
  try {
    window.sessionStorage.setItem(key(eventId), clean.toLowerCase());
  } catch {
    // sessionStorage indisponível — atribuição é opcional, nunca bloqueia a compra
  }
}

export function getStoredRef(eventId: string): string | undefined {
  if (typeof window === "undefined" || !eventId) return undefined;
  try {
    return window.sessionStorage.getItem(key(eventId)) ?? undefined;
  } catch {
    return undefined;
  }
}
