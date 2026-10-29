// Clientes recorrentes do dashboard administrativo.
//
// DEFINIÇÃO (fórmula):
//   Universo de vendas = pagas (status 'pago'), NÃO cortesia, com comprador
//   identificado (customer_id) e com evento.
//   Comprador recorrente = comprador com vendas desse universo em 2 OU MAIS
//   EVENTOS DISTINTOS (qualquer data). Várias compras no MESMO evento contam como 1.
//   Base (denominador) = compradores distintos com ao menos 1 venda do universo no
//   escopo atual (todos os eventos, ou só o evento selecionado).
//   Taxa (%) = recorrentes ÷ base × 100, com 1 casa decimal; sem base = sem taxa (null).
//
// LIMITE CONHECIDO: vendas sem customer_id (quem comprou sem criar conta) ficam FORA
// do cálculo, de propósito. WhatsApp e e-mail da venda não servem de identidade
// confiável (há contatos compartilhados por pessoas diferentes), e o projeto não
// infere pessoas por nome ou contato. Por isso a taxa é "entre compradores
// identificados" e o painel mostra a cobertura (veja recurrenceHint).
//
// Lógica pura (sem rede nem banco) para poder ser testada.

export interface RecurrenceSale {
  customer_id: string | null;
  event_id: string | null;
}

export interface RecurrenceResult {
  /** Compradores do escopo com compra paga em 2+ eventos distintos. */
  recurringCustomers: number;
  /** Compradores distintos e identificados do escopo (denominador da taxa). */
  identifiedBuyers: number;
  /** Percentual com 1 casa decimal; null quando não há compradores identificados. */
  recurringRate: number | null;
}

/**
 * @param sales   vendas elegíveis da organização INTEIRA (pagas, não cortesia). A recorrência
 *                olha todos os eventos, mesmo quando o painel está filtrado em um evento.
 * @param scopeEventId evento selecionado no painel; vazio = todos os eventos.
 */
export function computeRecurrence(
  sales: readonly RecurrenceSale[],
  scopeEventId?: string | null,
): RecurrenceResult {
  const eventsByCustomer = new Map<string, Set<string>>();
  for (const sale of sales) {
    if (!sale.customer_id || !sale.event_id) continue;
    const events = eventsByCustomer.get(sale.customer_id) ?? new Set<string>();
    events.add(sale.event_id);
    eventsByCustomer.set(sale.customer_id, events);
  }

  const buyersInScope = new Set<string>();
  for (const sale of sales) {
    if (!sale.customer_id || !sale.event_id) continue;
    if (scopeEventId && sale.event_id !== scopeEventId) continue;
    buyersInScope.add(sale.customer_id);
  }

  let recurringCustomers = 0;
  for (const customerId of buyersInScope) {
    if ((eventsByCustomer.get(customerId)?.size ?? 0) >= 2) recurringCustomers++;
  }
  const identifiedBuyers = buyersInScope.size;
  const recurringRate = identifiedBuyers > 0 ? Math.round((recurringCustomers / identifiedBuyers) * 1000) / 10 : null;
  return { recurringCustomers, identifiedBuyers, recurringRate };
}

export interface RecurrenceCoverage {
  /** Vendas pagas (não cortesia) do escopo com comprador identificado. */
  identifiedSales: number;
  /** Todas as vendas pagas (não cortesia) do escopo. */
  totalSales: number;
}

/** Texto da dica do painel: a fórmula e quanto das vendas entra no cálculo. */
export function recurrenceHint(coverage: RecurrenceCoverage | null | undefined): string {
  const base =
    "Recorrente = comprador com compra paga em 2 ou mais eventos distintos (várias compras no mesmo evento contam como 1). " +
    "Taxa = recorrentes ÷ compradores identificados × 100.";
  if (!coverage || coverage.totalSales <= 0) return base;
  const pct = Math.round((coverage.identifiedSales / coverage.totalSales) * 100);
  return (
    `${base} Só entram compradores identificados (com conta): hoje ${pct}% das vendas pagas ` +
    `(${coverage.identifiedSales} de ${coverage.totalSales}). Compras sem conta ficam de fora porque não dá para reconhecer a mesma pessoa entre eventos com segurança.`
  );
}
