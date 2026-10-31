// Rastreamento anônimo de visitas à página pública do evento (TicketFlow Insights).
//
// O que guardamos: um identificador aleatório sorteado no próprio navegador (visitor_id), o site de
// origem (só o domínio), parâmetros de campanha (utm_*) e o código ?ref= do link de venda.
// O que NÃO guardamos: IP, impressão digital do aparelho, nome, e-mail ou qualquer dado pessoal.
//
// Funções puras (sem rede), para poderem ser testadas.

const VISITOR_KEY = "tf_vid";
const MAX_FIELD = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Papéis internos: visitas de quem trabalha no sistema não entram na conta do público.
const STAFF_ROLES = new Set(["admin", "colaborador", "operador_checkin"]);

// Robôs que executam JavaScript (os de pré-visualização do WhatsApp/Instagram nem chegam aqui).
const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|telegram|curl|wget/i;

export interface VisitSource {
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  link_code: string | null;
}

export function isValidVisitorId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function randomUuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Lê (ou cria e guarda) o identificador anônimo do visitante. Sem armazenamento: devolve null. */
export function getOrCreateVisitorId(
  storage?: Pick<Storage, "getItem" | "setItem">,
  makeId: () => string = randomUuid,
): string | null {
  try {
    const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!store) return null;
    const current = store.getItem(VISITOR_KEY);
    if (isValidVisitorId(current)) return current;
    const id = makeId();
    store.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Navegador bloqueou o armazenamento: a visita ainda conta como visualização, só não como visitante único.
    return null;
  }
}

export function isLikelyBot(userAgent?: string | null | undefined, webdriver?: boolean | null | undefined): boolean {
  if (webdriver === true) return true;
  return !!userAgent && BOT_RE.test(userAgent);
}

export interface TrackDecisionInput {
  userAgent?: string | null | undefined;
  webdriver?: boolean | null | undefined;
  role?: string | null | undefined;
  authLoading?: boolean | undefined;
}

/** Decide se esta visita deve ser registrada. Espera a autenticação carregar para saber quem é. */
export function shouldTrackVisit({ userAgent, webdriver, role, authLoading }: TrackDecisionInput): boolean {
  if (authLoading) return false;
  if (isLikelyBot(userAgent, webdriver)) return false;
  if (role && STAFF_ROLES.has(role)) return false;
  return true;
}

function cleanField(value: string | null | undefined): string | null {
  if (!value) return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().toLowerCase().slice(0, MAX_FIELD);
  return cleaned || null;
}

function hostOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Origem da visita.
 * @param search   query string da URL atual (ex.: "?utm_source=instagram&utm_medium=bio")
 * @param referrer document.referrer
 * @param ownHost  domínio do próprio site: navegação interna (ex.: vindo de /links) não vira "origem"
 * @param ref      código ?ref= do link de venda
 */
export function parseVisitSource(search: string, referrer: string, ownHost: string, ref?: string | null | undefined): VisitSource {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    params = new URLSearchParams();
  }
  const refHost = referrer ? hostOf(referrer) : null;
  const own = ownHost.toLowerCase().replace(/^www\./, "");
  return {
    referrer_host: refHost && refHost !== own ? cleanField(refHost) : null,
    utm_source: cleanField(params.get("utm_source")),
    utm_medium: cleanField(params.get("utm_medium")),
    utm_campaign: cleanField(params.get("utm_campaign")),
    link_code: cleanField(ref),
  };
}
