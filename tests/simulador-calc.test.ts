import { describe, expect, test } from "bun:test";
import { calcBar, clampMarginPct, lotsFromBatches } from "../src/lib/simulador-calc";

describe("simulador — bar", () => {
  test("custo dos produtos = público total × consumo médio × (100% − margem)", () => {
    // 300 vendidos + 20 cortesias = 320 pessoas × R$ 50 = R$ 16.000 de receita
    // margem 70% → custo = 30% da receita = R$ 4.800; lucro = R$ 11.200
    const r = calcBar({
      hasBar: true,
      totalSold: 300,
      courtesies: 20,
      avgSpend: 50,
      expectedMarginPct: 70,
    });
    expect(r.totalAudience).toBe(320);
    expect(r.revenue).toBe(16000);
    expect(r.cost).toBe(4800);
    expect(r.profit).toBe(11200);
  });

  test("cortesias entram no público, mesmo sem nenhum ingresso vendido", () => {
    const r = calcBar({
      hasBar: true,
      totalSold: 0,
      courtesies: 10,
      avgSpend: 40,
      expectedMarginPct: 50,
    });
    expect(r.totalAudience).toBe(10);
    expect(r.revenue).toBe(400);
    expect(r.cost).toBe(200);
  });

  test("sem bar: receita, custo e lucro ficam zerados, mas o público total continua existindo", () => {
    const r = calcBar({
      hasBar: false,
      totalSold: 100,
      courtesies: 5,
      avgSpend: 50,
      expectedMarginPct: 70,
    });
    expect(r.totalAudience).toBe(105);
    expect(r.revenue).toBe(0);
    expect(r.cost).toBe(0);
    expect(r.profit).toBe(0);
  });

  test("margem 0% → custo é toda a receita; margem 100% → custo zero", () => {
    const base = { hasBar: true, totalSold: 100, courtesies: 0, avgSpend: 10 };
    expect(calcBar({ ...base, expectedMarginPct: 0 }).cost).toBe(1000);
    expect(calcBar({ ...base, expectedMarginPct: 100 }).cost).toBe(0);
  });

  test("margem acima de 100% ou negativa nunca gera custo negativo", () => {
    const base = { hasBar: true, totalSold: 100, courtesies: 0, avgSpend: 10 };
    expect(calcBar({ ...base, expectedMarginPct: 250 }).cost).toBe(0);
    expect(calcBar({ ...base, expectedMarginPct: -30 }).cost).toBe(1000);
    expect(clampMarginPct(Number.NaN)).toBe(0);
  });

  test("arredonda em centavos (sem 599.9999999)", () => {
    const r = calcBar({
      hasBar: true,
      totalSold: 3,
      courtesies: 0,
      avgSpend: 33.33,
      expectedMarginPct: 33.3,
    });
    expect(r.cost).toBe(Math.round(r.cost * 100) / 100);
    expect(r.revenue).toBe(99.99);
  });
});

describe("simulador — importar lotes de um evento real", () => {
  const batches = [
    { id: "b1", name: "1º Lote", price: "25.00", is_courtesy: false },
    { id: "b2", name: "2º Lote", price: 30, is_courtesy: false },
    { id: "b3", name: "Cortesia", price: 0, is_courtesy: true },
  ];

  test("importa só lotes pagos, com nome e preço", () => {
    const lots = lotsFromBatches("ev1", batches);
    expect(lots.map((l) => l.name)).toEqual(["1º Lote", "2º Lote"]);
    expect(lots.map((l) => l.price)).toEqual([25, 30]);
  });

  test("vendas estimadas começam em zero (nunca usa vendas reais)", () => {
    expect(lotsFromBatches("ev1", batches).every((l) => l.sold === 0)).toBe(true);
  });

  test("ids são únicos e ligados ao evento", () => {
    const ids = lotsFromBatches("ev1", batches).map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("ev1-b1");
  });

  test("evento só com cortesia, ou sem lotes, não gera lote nenhum", () => {
    expect(lotsFromBatches("ev1", [batches[2]])).toEqual([]);
    expect(lotsFromBatches("ev1", [])).toEqual([]);
  });

  test("preço vazio ou inválido vira 0, nunca NaN nem negativo", () => {
    const lots = lotsFromBatches("ev1", [
      { id: "x", name: "A", price: null, is_courtesy: false },
      { id: "y", name: "B", price: "abc", is_courtesy: false },
      { id: "z", name: "C", price: -5, is_courtesy: false },
    ]);
    expect(lots.map((l) => l.price)).toEqual([0, 0, 0]);
  });
});
