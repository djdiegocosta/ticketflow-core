import { describe, expect, test } from "bun:test";
import { isUnresolvedPixFailure } from "../src/lib/pix-failures";

const fail = (stage: string) => JSON.stringify({ stage, message: "x" });

describe("alerta de falhas de Pix", () => {
  test("conta falha de venda que ficou sem Pix", () => {
    expect(isUnresolvedPixFailure({ mp_debug_response: fail("mp_rejected"), mp_payment_id: null })).toBe(true);
    expect(isUnresolvedPixFailure({ mp_debug_response: fail("missing_qr_code"), mp_payment_id: null })).toBe(true);
    expect(isUnresolvedPixFailure({ mp_debug_response: fail("exception"), mp_payment_id: null })).toBe(true);
  });

  test("não conta falha já resolvida (cliente tentou de novo e o Pix saiu)", () => {
    expect(isUnresolvedPixFailure({ mp_debug_response: fail("exception"), mp_payment_id: "123456" })).toBe(false);
  });

  test("ignora registros sem falha, etapas desconhecidas e texto inválido", () => {
    expect(isUnresolvedPixFailure({ mp_debug_response: null, mp_payment_id: null })).toBe(false);
    expect(isUnresolvedPixFailure({ mp_debug_response: fail("outra_etapa"), mp_payment_id: null })).toBe(false);
    expect(isUnresolvedPixFailure({ mp_debug_response: "isto não é json", mp_payment_id: null })).toBe(false);
    expect(isUnresolvedPixFailure({ mp_debug_response: JSON.stringify({}), mp_payment_id: null })).toBe(false);
  });
});
