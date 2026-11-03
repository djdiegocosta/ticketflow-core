import { describe, expect, test } from "bun:test";
import { suggestSalesOpenAt } from "../src/lib/sales-open";

describe("sugestão de abertura das vendas", () => {
  test("usa o início do primeiro lote de venda", () => {
    const lotes = [
      { inicio: "2026-10-22T18:00", is_courtesy: false },
      { inicio: "2026-10-30T09:00", is_courtesy: false },
    ];
    expect(suggestSalesOpenAt(lotes)).toBe("2026-10-22T18:00");
  });

  test("não depende da ordem em que os lotes foram digitados", () => {
    const lotes = [
      { inicio: "2026-10-30T09:00", is_courtesy: false },
      { inicio: "2026-10-22T18:00", is_courtesy: false },
    ];
    expect(suggestSalesOpenAt(lotes)).toBe("2026-10-22T18:00");
  });

  test("lote de cortesia mais cedo não abre as vendas", () => {
    const lotes = [
      { inicio: "2026-10-20T10:00", is_courtesy: true },
      { inicio: "2026-10-22T18:00", is_courtesy: false },
    ];
    expect(suggestSalesOpenAt(lotes)).toBe("2026-10-22T18:00");
  });

  test("lotes sem data de início ou só de cortesia: sem sugestão", () => {
    expect(suggestSalesOpenAt([{ inicio: "", is_courtesy: false }])).toBe("");
    expect(suggestSalesOpenAt([{ inicio: "2026-10-20T10:00", is_courtesy: true }])).toBe("");
    expect(suggestSalesOpenAt([])).toBe("");
    expect(suggestSalesOpenAt([{ is_courtesy: false }])).toBe("");
  });

  test("ignora espaços em branco", () => {
    expect(suggestSalesOpenAt([{ inicio: "  2026-10-22T18:00 ", is_courtesy: false }])).toBe("2026-10-22T18:00");
    expect(suggestSalesOpenAt([{ inicio: "   ", is_courtesy: false }])).toBe("");
  });
});
