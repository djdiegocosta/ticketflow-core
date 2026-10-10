import { describe, expect, test } from "bun:test";
import { decideReopen } from "../src/lib/mp/reopen-sale";

describe("Pix de reserva expirada", () => {
  test("reserva reaberta ou ainda válida: segue e gera o Pix", () => {
    expect(decideReopen("ok")).toEqual({ proceed: true });
    expect(decideReopen("reopened")).toEqual({ proceed: true });
  });

  test("lote esgotado: único bloqueio, com mensagem clara", () => {
    const r = decideReopen("sold_out");
    expect(r.proceed).toBe(false);
    if (!r.proceed) expect(r.message).toContain("esgotaram");
  });

  test("venda já paga mantém a mensagem original", () => {
    expect(decideReopen("already_paid")).toEqual({ proceed: false, message: "A venda já foi processada" });
  });

  test("venda cancelada, inexistente ou resposta inesperada: nunca segue às cegas", () => {
    for (const result of ["invalid_state", "not_found", "algo_novo", null, undefined, 7]) {
      const r = decideReopen(result);
      expect(r.proceed).toBe(false);
      if (!r.proceed) expect(r.message).toBe("Esta reserva não está mais disponível.");
    }
  });
});
