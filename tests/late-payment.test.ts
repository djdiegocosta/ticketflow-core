import { describe, expect, test } from "bun:test";
import { interpretLateConfirmation } from "../src/lib/mp/late-payment";

const sale = { sale_code: "1A494A29", total_amount: 25 };

describe("pagamento aprovado depois da reserva expirar", () => {
  test("confirmada: segue o fluxo normal (ingresso e e-mail)", () => {
    expect(interpretLateConfirmation("confirmed", sale)).toEqual({ kind: "continue" });
  });

  test("já paga (aviso repetido): não faz nada nem reenvia e-mail", () => {
    expect(interpretLateConfirmation("already_paid", sale)).toEqual({ kind: "already_done" });
  });

  test("sem estoque: avisa a equipe para decidir entre reembolsar ou liberar", () => {
    const r = interpretLateConfirmation("sold_out", sale);
    expect(r.kind).toBe("alert");
    if (r.kind === "alert") {
      expect(r.title).toBe("Pagamento recebido sem estoque");
      expect(r.body).toContain("1A494A29");
      expect(r.body).toContain("R$ 25,00");
      expect(r.body).toContain("reembolsar");
    }
  });

  test("estado inesperado, venda inexistente ou resposta desconhecida: nunca engole em silêncio", () => {
    for (const result of ["invalid_state", "not_found", "algo_novo", null, undefined, 42]) {
      const r = interpretLateConfirmation(result, sale);
      expect(r.kind).toBe("alert");
    }
  });

  test("formata o valor em reais com vírgula", () => {
    const r = interpretLateConfirmation("sold_out", { sale_code: "X", total_amount: 1234.5 });
    if (r.kind === "alert") expect(r.body).toContain("R$ 1234,50");
  });
});
