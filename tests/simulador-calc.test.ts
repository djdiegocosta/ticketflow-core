import { describe, expect, test } from "bun:test";
import { calcBar, clampMarginPct } from "../src/lib/simulador-calc";

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
