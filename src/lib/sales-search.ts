/**
 * Busca da lista de Vendas (Admin → Vendas).
 *
 * Procura por nome do cliente, código da venda ou WhatsApp.
 * - Ignora maiúsculas, minúsculas e acentos ("joao" acha "João").
 * - Várias palavras: todas precisam aparecer ("maria silva" acha "Maria da Silva").
 * - WhatsApp só entra na busca quando o texto digitado é só número/máscara de telefone.
 *   (Antes, um texto sem nenhum número virava "" e "".includes("") é sempre verdadeiro:
 *   qualquer busca por nome devolvia TODAS as vendas, sem filtrar nada.)
 */

export type SearchableSale = {
  buyer_name?: string | null;
  buyer_whatsapp?: string | null;
  sale_code?: string | null;
};

/** Minúsculas, sem acentos e com espaços normalizados. */
export function normalizeSearchText(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Texto que parece telefone: só dígitos e símbolos de máscara, com pelo menos 1 dígito. */
const PHONE_LIKE = /^[\d\s()+\-.]+$/;

export function saleMatchesSearch(sale: SearchableSale, rawTerm: string): boolean {
  const term = normalizeSearchText(rawTerm);
  if (!term) return true;

  const haystack = `${normalizeSearchText(sale.buyer_name)} ${normalizeSearchText(sale.sale_code)}`;
  const tokens = term.split(" ");
  if (tokens.every((token) => haystack.includes(token))) return true;

  if (PHONE_LIKE.test(term)) {
    const digits = term.replace(/\D/g, "");
    if (digits.length > 0) {
      const phone = (sale.buyer_whatsapp ?? "").replace(/\D/g, "");
      if (phone.includes(digits)) return true;
    }
  }
  return false;
}
