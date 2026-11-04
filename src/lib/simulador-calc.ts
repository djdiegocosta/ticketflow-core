/**
 * Cálculo do bar no Simulador de Evento (docs/TPS.md, seção 8.10).
 *
 * O custo dos produtos do bar NÃO é digitado: sai da relação
 *   Público total × Consumo médio por pessoa × (100% − Margem bruta esperada).
 */

/** Margem é uma porcentagem: valores inválidos viram 0 e o teto é 100. */
export function clampMarginPct(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(100, value);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type BarInput = {
  hasBar: boolean;
  /** Ingressos vendidos (estimados), soma de todos os lotes. */
  totalSold: number;
  /** Cortesias: não geram receita de ingresso, mas contam como público presente. */
  courtesies: number;
  /** Consumo médio por pessoa, em R$. */
  avgSpend: number;
  /** Margem bruta esperada do bar, em %. */
  expectedMarginPct: number;
};

export type BarResult = {
  /** Público total do evento = vendidos + cortesias (existe com ou sem bar). */
  totalAudience: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
};

export function calcBar(input: BarInput): BarResult {
  const totalAudience = Math.max(0, input.totalSold) + Math.max(0, input.courtesies);
  const marginPct = clampMarginPct(input.expectedMarginPct);
  const revenue = input.hasBar ? round2(Math.max(0, input.avgSpend) * totalAudience) : 0;
  const cost = round2(revenue * (1 - marginPct / 100));
  const profit = round2(revenue - cost);
  return { totalAudience, revenue, cost, profit, marginPct };
}

/** Lote como o simulador usa (projeção: nunca carrega vendas reais). */
export type SimulatorLot = { id: string; name: string; price: number; sold: number };

/** Parte mínima de um lote real (`ticket_batches`) necessária para importar. */
export type ImportableBatch = {
  id: string;
  name: string;
  price: number | string | null;
  is_courtesy: boolean;
};

/**
 * Converte os lotes de um evento real em lotes do simulador.
 * - só lotes pagos: o lote de cortesia não vira lote de ingresso;
 * - vendas estimadas começam em zero: o simulador nunca usa vendas reais.
 */
export function lotsFromBatches(eventId: string, batches: ImportableBatch[]): SimulatorLot[] {
  return batches
    .filter((b) => !b.is_courtesy)
    .map((b) => ({
      id: `${eventId}-${b.id}`,
      name: b.name,
      price: Math.max(0, Number(b.price) || 0),
      sold: 0,
    }));
}
