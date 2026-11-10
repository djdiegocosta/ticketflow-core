import { describe, expect, test } from "bun:test";
import {
  brtDateString,
  buildHeatmap,
  formatBarLabel,
  formatMeasure,
  heatBackground,
  lowSampleNote,
  periodRange,
  sharePercent,
  topBucketIndex,
  type CrossRow,
} from "../src/lib/insights-format";

const row = (lead_band: string, dow: number, month_period: string, orders: number, tickets = orders): CrossRow => ({
  lead_band,
  lead_band_order: 0,
  dow,
  dow_label: "",
  month_period,
  month_period_order: 0,
  orders,
  tickets,
});

describe("períodos", () => {
  test("a data é a de Brasília (22h de 30/10 em Brasília já é 31/10 em UTC)", () => {
    expect(brtDateString(new Date("2026-10-31T01:30:00Z"))).toBe("2026-10-30");
    expect(brtDateString(new Date("2026-10-31T12:00:00Z"))).toBe("2026-10-31");
  });

  test("últimos 30 e 90 dias incluem o dia de hoje", () => {
    const now = new Date("2026-10-31T15:00:00Z");
    expect(periodRange("30d", now)).toEqual({ from: "2026-10-02", to: "2026-10-31" });
    expect(periodRange("90d", now)).toEqual({ from: "2026-08-03", to: "2026-10-31" });
  });

  test("tudo e personalizado não limitam", () => {
    expect(periodRange("all")).toEqual({ from: null, to: null });
    expect(periodRange("custom")).toEqual({ from: null, to: null });
  });
});

describe("números e formatação", () => {
  test("participação em %", () => {
    expect(sharePercent(1, 4)).toBe("25%");
    expect(sharePercent(2, 3)).toBe("67%");
    expect(sharePercent(0, 0)).toBe("—");
  });

  test("receita em reais, o resto como inteiro", () => {
    expect(formatMeasure(1234.5, "revenue").replace(/\s/g, " ")).toBe("R$ 1.234,50");
    expect(formatMeasure(1234, "orders")).toBe("1.234");
  });

  test("maior balde: primeiro em empate, -1 se tudo zero", () => {
    expect(topBucketIndex([1, 5, 5, 2])).toBe(1);
    expect(topBucketIndex([0, 0])).toBe(-1);
    expect(topBucketIndex([])).toBe(-1);
  });

  test("aviso de amostra pequena abaixo de 30 vendas", () => {
    expect(lowSampleNote(0)).toBeNull();
    expect(lowSampleNote(1)).toContain("1 venda");
    expect(lowSampleNote(29)).toContain("29 vendas");
    expect(lowSampleNote(30)).toBeNull();
  });
});

describe("mapa de calor antecedência x dia da semana", () => {
  const rows = [
    row("D-14 a D-8", 7, "6 a 10", 2),
    row("D-14 a D-8", 7, "26 a 31", 1),
    row("D0", 7, "16 a 20", 2, 3),
    row("D-20 a D-15", 6, "1 a 5", 1),
    row("Fora da janela", 3, "26 a 31", 4),
  ];

  test("soma por célula (linha = faixa, coluna = dia) e separa o que está fora da janela", () => {
    const h = buildHeatmap(rows, "orders", "all");
    expect(h.cells[1]?.[6]).toBe(3); // D-14 a D-8 x Dom
    expect(h.cells[4]?.[6]).toBe(2); // D0 x Dom
    expect(h.cells[0]?.[5]).toBe(1); // D-20 a D-15 x Sáb
    expect(h.total).toBe(6);
    expect(h.outside).toBe(4);
    expect(h.max).toBe(3);
  });

  test("filtro por período do mês", () => {
    const h = buildHeatmap(rows, "orders", "6 a 10");
    expect(h.total).toBe(2);
    expect(h.cells[1]?.[6]).toBe(2);
  });

  test("medida ingressos usa os ingressos; receita cai para vendas", () => {
    expect(buildHeatmap(rows, "tickets", "all").cells[4]?.[6]).toBe(3);
    expect(buildHeatmap(rows, "revenue", "all").cells[4]?.[6]).toBe(2);
  });

  test("sem dados: grade vazia sem quebrar", () => {
    const h = buildHeatmap([], "orders", "all");
    expect(h.total).toBe(0);
    expect(h.max).toBe(0);
    expect(h.cells.length).toBe(5);
    expect(h.cells[0]?.length).toBe(7);
  });

  test("cor: transparente sem venda; mais forte quanto maior o valor", () => {
    expect(heatBackground(0, 5)).toBe("transparent");
    expect(heatBackground(3, 0)).toBe("transparent");
    expect(heatBackground(5, 5)).toContain("85%");
    expect(heatBackground(1, 5)).toContain("29%");
  });
});

describe("número no topo das barras", () => {
  test("ingressos e vendas: número inteiro; zero mostra \"0\"", () => {
    expect(formatBarLabel(37, "tickets")).toBe("37");
    expect(formatBarLabel(1234, "tickets")).toBe("1.234");
    expect(formatBarLabel(5, "orders")).toBe("5");
    expect(formatBarLabel(0, "tickets")).toBe("0");
  });

  test("receita usa forma compacta para caber sobre barras estreitas", () => {
    expect(formatBarLabel(850, "revenue")).toBe("850");
    expect(formatBarLabel(1234, "revenue")).toBe("1,2\u00a0mil");
    expect(formatBarLabel(12500, "revenue")).toBe("12,5\u00a0mil");
    expect(formatBarLabel(0, "revenue")).toBe("0");
  });

  test("média por evento mostra porcentagem", () => {
    expect(formatBarLabel(14.285, "tickets", true)).toBe("14,3%");
    expect(formatBarLabel(0, "tickets", true)).toBe("0%");
  });

  test("valores inválidos ou negativos não geram texto", () => {
    expect(formatBarLabel(Number.NaN, "tickets")).toBe("");
    expect(formatBarLabel(-3, "tickets")).toBe("");
  });
});
