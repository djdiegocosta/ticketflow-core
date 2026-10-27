// Resumo do pedido mostrado na tela de pagamento do checkout.
//
// Depois que a reserva existe, o nome do lote, a quantidade e o total vêm da PRÓPRIA
// reserva (gravados pelo servidor), nunca da lista de lotes à venda: essa lista muda
// durante o pagamento (o cliente pode ter levado o último ingresso, o prazo do lote
// pode terminar) e na retomada de um pagamento (?resume=) ela nem sabe qual lote era.
// Lógica pura (sem rede nem tela) para poder ser testada.

export interface OrderSummary {
  name: string;
  quantity: number;
  total: number;
}

export interface OrderSummaryFallback {
  batch: { name: string; price: number } | undefined;
  quantity: number;
}

// Number(null) e Number("") valem 0: vazio NÃO pode virar "R$ 0,00" no resumo.
function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

export function buildOrderSummary(
  sale: { quantity: number | null; total_amount: number | string | null; batchName?: string | null },
): OrderSummary | null {
  const quantity = toNumber(sale.quantity);
  const total = toNumber(sale.total_amount);
  if (!Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(total) || total < 0) return null;
  return { name: sale.batchName?.trim() || "Ingresso", quantity, total };
}

/** Linha do resumo: usa a reserva quando existe; senão o lote escolhido (antes de reservar). */
export function orderSummaryLine(
  summary: OrderSummary | null,
  fallback: OrderSummaryFallback,
): { label: string; total: number } {
  if (summary) return { label: `${summary.quantity}x ${summary.name}`, total: summary.total };
  const price = fallback.batch?.price ?? 0;
  return { label: `${fallback.quantity}x ${fallback.batch?.name ?? "Ingresso"}`, total: price * fallback.quantity };
}
