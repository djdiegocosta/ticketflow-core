/**
 * Ordena os lotes disponíveis pelo preço crescente sem alterar a lista original.
 * O sort do JavaScript é estável: lotes com o mesmo preço mantêm a ordem recebida.
 */
export type BatchWithPrice = { price: number };

export function sortBatchesByPrice<T extends BatchWithPrice>(batches: readonly T[] | null | undefined): T[] {
  return [...(batches ?? [])].sort((a, b) => a.price - b.price);
}
