/**
 * Caminho de volta após login/cadastro (ex.: voltar ao checkout do evento).
 * Só aceita caminhos internos de evento ("/e/...") — qualquer outra coisa é
 * ignorada, para o link não poder mandar o cliente para outro site.
 */
export function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/e/") || value.startsWith("//") || value.includes("\\") || value.includes("..")) return undefined;
  return value;
}
