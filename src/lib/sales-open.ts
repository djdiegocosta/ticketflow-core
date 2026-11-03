// Abertura das vendas do evento (TicketFlow Insights).
// Sugestão usada nos formulários: o início do primeiro lote de venda (cortesia não abre vendas).
// Formato dos valores: "YYYY-MM-DDTHH:mm" em horário de Brasília (o mesmo dos campos de lote).

export interface LoteComInicio {
  inicio?: string | undefined;
  is_courtesy?: boolean | undefined;
}

export function suggestSalesOpenAt(lotes: ReadonlyArray<LoteComInicio>): string {
  const inicios = lotes
    .filter((l) => !l.is_courtesy && typeof l.inicio === "string" && l.inicio.trim() !== "")
    .map((l) => (l.inicio as string).trim())
    .sort();
  return inicios[0] ?? "";
}
