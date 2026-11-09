/**
 * Meta Pixel — correspondência avançada manual (Advanced Matching).
 *
 * O Pixel é iniciado uma única vez, na abertura da página (src/routes/__root.tsx),
 * quando ainda não sabemos quem é o comprador. Quando o comprador informa seus dados
 * (checkout) ou quando a compra é confirmada, chamamos `fbq('init', ID, dados)` de novo:
 * isso apenas atualiza os dados do usuário no Pixel (não dispara PageView nem outro evento).
 * O próprio Pixel faz o hash (SHA-256) dos valores antes de enviar à Meta.
 *
 * Regras de segurança deste módulo:
 *  - nunca lança erro e nunca bloqueia nada (o checkout não pode depender do Pixel);
 *  - não grava dados pessoais em localStorage/sessionStorage/cookies (só memória da aba);
 *  - só usa nome, e-mail e WhatsApp — nenhum outro dado do comprador.
 */

export const META_PIXEL_ID = "2269701520646682";

export type AdvancedMatching = {
  /** e-mail */
  em?: string;
  /** telefone, só dígitos, com DDI (55) */
  ph?: string;
  /** primeiro nome */
  fn?: string;
  /** último sobrenome */
  ln?: string;
};

export type MatchingInput = {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value?: string | null): string | undefined {
  const email = (value ?? "").trim().toLowerCase();
  return EMAIL_REGEX.test(email) ? email : undefined;
}

/** Telefone do Brasil no formato da Meta: só dígitos, com DDI 55 (ex.: 5521999998888). */
export function normalizePhone(value?: string | null): string | undefined {
  let digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  digits = digits.replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return undefined;
}

/** Primeiro nome e último sobrenome, minúsculos e sem pontuação/números. */
export function normalizeName(value?: string | null): { fn?: string; ln?: string } {
  const parts = (value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const fn = parts[0];
  const ln = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const result: { fn?: string; ln?: string } = {};
  if (fn) result.fn = fn;
  if (ln) result.ln = ln;
  return result;
}

/** Monta o objeto de correspondência avançada, só com os campos válidos. */
export function buildAdvancedMatching(input: MatchingInput): AdvancedMatching {
  const result: AdvancedMatching = {};
  const em = normalizeEmail(input.email);
  const ph = normalizePhone(input.phone);
  const { fn, ln } = normalizeName(input.name);
  if (em) result.em = em;
  if (ph) result.ph = ph;
  if (fn) result.fn = fn;
  if (ln) result.ln = ln;
  return result;
}

// Memória da aba (não persiste em disco): o que já foi enviado ao Pixel nesta sessão.
let lastSent: AdvancedMatching = {};

const sameMatching = (a: AdvancedMatching, b: AdvancedMatching) =>
  a.em === b.em && a.ph === b.ph && a.fn === b.fn && a.ln === b.ln;

/** Só para testes. */
export function resetMetaAdvancedMatching() {
  lastSent = {};
}

/**
 * Envia os dados do comprador ao Pixel. Devolve `true` se enviou, `false` se não havia
 * dado válido, se nada mudou, ou se o Pixel não está disponível. Nunca lança erro.
 *
 * Se for a mesma pessoa que já havia informado dados (mesmo telefone), completa o que
 * faltar (ex.: o e-mail, que a confirmação da compra não recebe). Se for outra pessoa
 * no mesmo aparelho, substitui tudo — nunca mistura dados de pessoas diferentes.
 */
export function setMetaAdvancedMatching(input: MatchingInput): boolean {
  try {
    if (typeof window === "undefined") return false;
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq !== "function") return false;

    const fresh = buildAdvancedMatching(input);
    if (Object.keys(fresh).length === 0) return false;

    const samePerson = !!fresh.ph && fresh.ph === lastSent.ph;
    const merged: AdvancedMatching = samePerson ? { ...lastSent, ...fresh } : fresh;
    if (sameMatching(merged, lastSent)) return false;

    fbq("init", META_PIXEL_ID, merged);
    lastSent = merged;
    return true;
  } catch {
    return false;
  }
}
