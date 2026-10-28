import { describe, expect, test } from "bun:test";
import { computeRecurrence, recurrenceHint, type RecurrenceSale } from "../src/lib/recurrence";

const BEAT = "evento-e-o-beat";
const MR = "evento-modo-revoada";
const HAL = "evento-halloween";

const buy = (customer: string | null, event: string | null): RecurrenceSale => ({ customer_id: customer, event_id: event });

describe("clientes recorrentes: o problema original", () => {
  test("quem comprou várias vezes no MESMO evento NÃO é recorrente", () => {
    const sales = [buy("ana", BEAT), buy("ana", BEAT), buy("ana", BEAT)];
    // a regra antiga (compras > 1 por cliente) contaria a Ana como recorrente
    const comprasPorCliente = sales.filter((s) => s.customer_id === "ana").length;
    expect(comprasPorCliente > 1).toBe(true);
    expect(computeRecurrence(sales)).toEqual({ recurringCustomers: 0, identifiedBuyers: 1, recurringRate: 0 });
  });

  test("quem comprou em 2 eventos distintos é recorrente, e conta uma única vez", () => {
    const sales = [buy("bia", BEAT), buy("bia", BEAT), buy("bia", MR), buy("bia", MR), buy("bia", MR)];
    expect(computeRecurrence(sales)).toEqual({ recurringCustomers: 1, identifiedBuyers: 1, recurringRate: 100 });
  });

  test("3 eventos distintos continuam sendo 1 recorrente", () => {
    expect(computeRecurrence([buy("caio", BEAT), buy("caio", MR), buy("caio", HAL)]).recurringCustomers).toBe(1);
  });
});

describe("clientes recorrentes: base e escopo", () => {
  test("vendas sem comprador identificado ou sem evento ficam fora do cálculo", () => {
    const sales = [buy(null, BEAT), buy(null, MR), buy("dani", null), buy("eva", BEAT)];
    expect(computeRecurrence(sales)).toEqual({ recurringCustomers: 0, identifiedBuyers: 1, recurringRate: 0 });
  });

  test("sem nenhum comprador identificado não há taxa (nunca 0% inventado)", () => {
    expect(computeRecurrence([])).toEqual({ recurringCustomers: 0, identifiedBuyers: 0, recurringRate: null });
    expect(computeRecurrence([buy(null, BEAT)]).recurringRate).toBeNull();
  });

  test("filtrando um evento: a base são os compradores dele; recorrência olha todos os eventos", () => {
    const sales = [buy("fabio", BEAT), buy("fabio", MR), buy("gil", MR), buy("hugo", BEAT)];
    // no MR: fabio (também comprou no BEAT) e gil (só MR) -> 1 de 2
    expect(computeRecurrence(sales, MR)).toEqual({ recurringCustomers: 1, identifiedBuyers: 2, recurringRate: 50 });
    // sem filtro: 3 compradores, 1 recorrente
    expect(computeRecurrence(sales)).toEqual({ recurringCustomers: 1, identifiedBuyers: 3, recurringRate: 33.3 });
  });

  test("evento sem compradores devolve base zero e taxa nula", () => {
    expect(computeRecurrence([buy("ivo", BEAT)], MR)).toEqual({ recurringCustomers: 0, identifiedBuyers: 0, recurringRate: null });
  });

  test("a ordem das vendas não muda o resultado", () => {
    const sales = [buy("a", BEAT), buy("b", MR), buy("a", MR), buy("b", MR), buy("c", HAL)];
    const reversed = [...sales].reverse();
    expect(computeRecurrence(reversed)).toEqual(computeRecurrence(sales));
  });
});

describe("clientes recorrentes: conferência com os dados reais (28/10/2026)", () => {
  // Distribuição real dos compradores identificados, conferida por SQL independente:
  // 35 só no É O BEAT, 11 só no Modo Revoada, 5 só no Halloween, 5 em BEAT+MR, 1 em HAL+BEAT.
  const real: RecurrenceSale[] = [];
  const add = (prefix: string, n: number, events: string[]) => {
    for (let i = 0; i < n; i++) for (const ev of events) real.push(buy(`${prefix}${i}`, ev));
  };
  add("so-beat-", 35, [BEAT]);
  add("so-mr-", 11, [MR]);
  add("so-hal-", 5, [HAL]);
  add("beat-mr-", 5, [BEAT, MR]);
  add("hal-beat-", 1, [HAL, BEAT]);

  test("todos os eventos: 6 recorrentes de 57 (10,5%)", () => {
    expect(computeRecurrence(real)).toEqual({ recurringCustomers: 6, identifiedBuyers: 57, recurringRate: 10.5 });
  });
  test("É O BEAT: 6 de 41 (14,6%)", () => {
    expect(computeRecurrence(real, BEAT)).toEqual({ recurringCustomers: 6, identifiedBuyers: 41, recurringRate: 14.6 });
  });
  test("Modo Revoada: 5 de 16 (31,3%)", () => {
    expect(computeRecurrence(real, MR)).toEqual({ recurringCustomers: 5, identifiedBuyers: 16, recurringRate: 31.3 });
  });
  test("Halloween: 1 de 6 (16,7%)", () => {
    expect(computeRecurrence(real, HAL)).toEqual({ recurringCustomers: 1, identifiedBuyers: 6, recurringRate: 16.7 });
  });
});

describe("dica do painel", () => {
  test("explica a fórmula e a cobertura real das vendas", () => {
    const text = recurrenceHint({ identifiedSales: 73, totalSales: 116 });
    expect(text).toContain("2 ou mais eventos distintos");
    expect(text).toContain("63%");
    expect(text).toContain("73 de 116");
    expect(text).toContain("sem conta ficam de fora");
  });
  test("sem dados de cobertura mostra só a fórmula", () => {
    for (const coverage of [null, undefined, { identifiedSales: 0, totalSales: 0 }]) {
      const text = recurrenceHint(coverage);
      expect(text).toContain("Taxa = recorrentes");
      expect(text).not.toContain("%)");
    }
  });
});
