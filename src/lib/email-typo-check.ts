// Domínios de e-mail mais comuns entre os clientes do TicketFlow. Usado só
// para sugerir correção de erro de digitação — nunca para bloquear um
// domínio legítimo que não esteja nesta lista.
const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "hotmail.com.br",
  "outlook.com",
  "outlook.com.br",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "live.com",
  "msn.com",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "globo.com",
  "globomail.com",
  "ig.com.br",
  "r7.com",
  "protonmail.com",
  "aol.com",
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Sugere a correção de um e-mail com provável erro de digitação no domínio
 * (ex.: "nome@icloud.con" -> "nome@icloud.com"). Só sugere quando o domínio
 * está a exatamente 1 letra de diferença de um domínio comum — erro de
 * digitação clássico, tipo trocar "com" por "con" — para não incomodar
 * quem realmente usa um provedor menos comum.
 */
export function suggestEmailCorrection(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;

  const localPart = email.slice(0, at);
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!domain || !domain.includes(".")) return null;
  if (COMMON_EMAIL_DOMAINS.includes(domain)) return null;

  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  for (const known of COMMON_EMAIL_DOMAINS) {
    const distance = levenshtein(domain, known);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = known;
    }
  }

  if (bestMatch && bestDistance === 1) {
    return `${localPart}@${bestMatch}`;
  }
  return null;
}
