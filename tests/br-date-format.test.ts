import { describe, expect, test } from "bun:test";
import { formatBrtDate } from "../src/lib/br-datetime";

describe("data de cadastro do cliente", () => {
  test("formata no fuso de Brasília, não em UTC", () => {
    // 02:30 UTC de 11/10 ainda é 23:30 de 10/10 em Brasília
    expect(formatBrtDate("2026-10-11T02:30:00Z")).toBe("10/10/2026");
    expect(formatBrtDate("2026-10-11T12:00:00Z")).toBe("11/10/2026");
  });

  test("aceita o formato com fuso que o banco devolve", () => {
    expect(formatBrtDate("2026-08-21 15:04:05.123456+00")).toBe("21/08/2026");
  });

  test("vazio ou inválido mostra traço, nunca 'Invalid Date'", () => {
    expect(formatBrtDate(null)).toBe("—");
    expect(formatBrtDate(undefined)).toBe("—");
    expect(formatBrtDate("")).toBe("—");
    expect(formatBrtDate("não é data")).toBe("—");
  });
});
