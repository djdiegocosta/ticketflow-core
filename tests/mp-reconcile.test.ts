import { describe, expect, test } from "bun:test";
import { classifySale, sortDiscrepancies, type ReconcileSale } from "../src/lib/mp/reconcile";

const sale = (over: Partial<ReconcileSale> = {}): ReconcileSale => ({
  id: "sale-1",
  sale_code: "TF-001",
  status: "expirado",
  total_amount: 100,
  mp_payment_id: "999",
  created_at: "2026-10-06T20:00:00Z",
  buyer_name: "Cliente Teste",
  ...over,
});

describe("conferência com o Mercado Pago", () => {
  test("pago no MP e venda não confirmada é crítico", () => {
    const r = classifySale(sale(), { status: "approved", amount: 100, externalReference: "sale-1" });
    expect(r?.kind).toBe("pago_no_mp_nao_confirmado");
    expect(r?.severity).toBe("critico");
  });

  test("venda pendente também conta como não confirmada", () => {
    const r = classifySale(sale({ status: "pendente" }), { status: "approved", amount: 100, externalReference: "sale-1" });
    expect(r?.kind).toBe("pago_no_mp_nao_confirmado");
  });

  test("tudo certo: venda paga e aprovada não gera divergência", () => {
    expect(classifySale(sale({ status: "pago" }), { status: "approved", amount: 100, externalReference: "sale-1" })).toBeNull();
  });

  test("abandono normal: Pix gerado e nunca pago não é divergência", () => {
    for (const status of ["pending", "cancelled", "expired", "rejected"]) {
      expect(classifySale(sale(), { status, amount: 100, externalReference: "sale-1" })).toBeNull();
    }
  });

  test("pagamento aprovado ligado a outra venda exige conferência manual", () => {
    const r = classifySale(sale(), { status: "approved", amount: 100, externalReference: "outra-venda" });
    expect(r?.kind).toBe("referencia_diferente");
    expect(r?.severity).toBe("critico");
  });

  test("valor diferente exige conferência manual", () => {
    expect(classifySale(sale(), { status: "approved", amount: 90, externalReference: "sale-1" })?.kind).toBe("valor_diferente");
    expect(classifySale(sale(), { status: "approved", amount: null, externalReference: "sale-1" })?.kind).toBe("valor_diferente");
  });

  test("venda paga no sistema mas estornada no MP é importante", () => {
    const r = classifySale(sale({ status: "pago" }), { status: "refunded", amount: 100, externalReference: "sale-1" });
    expect(r?.kind).toBe("confirmado_sem_aprovacao_no_mp");
    expect(r?.severity).toBe("importante");
  });

  test("consulta que falhou vira aviso, nunca some em silêncio", () => {
    const r = classifySale(sale(), null, "timeout");
    expect(r?.kind).toBe("consulta_falhou");
    expect(r?.severity).toBe("aviso");
    expect(r?.detail).toBe("timeout");
  });

  test("ordena do mais grave para o menos grave, e do mais recente para o mais antigo", () => {
    const aviso = classifySale(sale({ id: "a", created_at: "2026-10-08T10:00:00Z" }), null)!;
    const critAntigo = classifySale(sale({ id: "b", created_at: "2026-10-05T10:00:00Z" }), { status: "approved", amount: 100, externalReference: "b" })!;
    const critNovo = classifySale(sale({ id: "c", created_at: "2026-10-07T10:00:00Z" }), { status: "approved", amount: 100, externalReference: "c" })!;
    expect(sortDiscrepancies([aviso, critAntigo, critNovo]).map((d) => d.saleId)).toEqual(["c", "b", "a"]);
  });
});
