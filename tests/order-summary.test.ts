import { describe, expect, test } from "bun:test";
import { buildOrderSummary, orderSummaryLine } from "../src/lib/order-summary";

describe("resumo do pedido na tela de pagamento", () => {
  test("retomar uma compra do Lote Especial mostra o lote, a quantidade e o total da reserva", () => {
    // caso real: 2 ingressos do "Lote Especial + COPO" (R$ 35 cada) = R$ 70
    const summary = buildOrderSummary({ quantity: 2, total_amount: 70, batchName: "Lote Especial + COPO" });
    // a lista de lotes à venda traria o 1º Lote (R$ 25): não pode influenciar o resumo
    const line = orderSummaryLine(summary, { batch: { name: "1º Lote", price: 25 }, quantity: 1 });
    expect(line).toEqual({ label: "2x Lote Especial + COPO", total: 70 });
  });

  test("se o lote sair da lista durante o pagamento, o resumo continua certo (nunca R$ 0,00)", () => {
    const summary = buildOrderSummary({ quantity: 1, total_amount: 35, batchName: "Lote Especial + COPO" });
    const line = orderSummaryLine(summary, { batch: undefined, quantity: 1 });
    expect(line.total).toBe(35);
    expect(line.label).toBe("1x Lote Especial + COPO");
  });

  test("antes de reservar, o resumo usa o lote escolhido e a quantidade", () => {
    const line = orderSummaryLine(null, { batch: { name: "1º Lote", price: 25 }, quantity: 3 });
    expect(line).toEqual({ label: "3x 1º Lote", total: 75 });
  });

  test("aceita valores que chegam como texto do banco", () => {
    expect(buildOrderSummary({ quantity: 2, total_amount: "70.00", batchName: "Especial" })).toEqual({
      name: "Especial",
      quantity: 2,
      total: 70,
    });
  });

  test("sem nome de lote usa 'Ingresso' em vez de texto vazio", () => {
    expect(buildOrderSummary({ quantity: 1, total_amount: 25, batchName: null })?.name).toBe("Ingresso");
    expect(buildOrderSummary({ quantity: 1, total_amount: 25, batchName: "   " })?.name).toBe("Ingresso");
  });

  test("dados inválidos da reserva não viram resumo (cai no lote escolhido)", () => {
    expect(buildOrderSummary({ quantity: null, total_amount: 25 })).toBeNull();
    expect(buildOrderSummary({ quantity: 0, total_amount: 25 })).toBeNull();
    expect(buildOrderSummary({ quantity: 1, total_amount: null })).toBeNull();
    expect(buildOrderSummary({ quantity: 1, total_amount: "abc" })).toBeNull();
    expect(buildOrderSummary({ quantity: 1, total_amount: "" })).toBeNull();
    expect(buildOrderSummary({ quantity: 1, total_amount: -5 })).toBeNull();
  });
});
