import { describe, expect, test } from "bun:test";
import { interpretCheckinRow, overlayText, vibrationFor } from "../src/lib/checkin-result";

const row = (over: Partial<Parameters<typeof interpretCheckinRow>[0]> = {}) => ({
  result: "sucesso",
  participant_name: "Maria Souza",
  event_title: "Modo Revoada",
  checked_in_at: null,
  ...over,
});

describe("resultado do check-in", () => {
  test("sucesso vira entrada válida", () => {
    expect(interpretCheckinRow(row(), "ABC-1", "Modo Revoada")).toMatchObject({ status: "valid", name: "Maria Souza" });
  });

  test("duplicidade vira INGRESSO JÁ UTILIZADO, com a hora do primeiro uso", () => {
    const r = interpretCheckinRow(row({ result: "duplicidade", checked_in_at: "2026-10-11T01:30:00Z" }), "ABC-1", "Modo Revoada");
    expect(r.status).toBe("already_used");
    expect(r.detail).toBe("22:30"); // 01:30 UTC = 22:30 em Brasília
    expect(overlayText(r.status, r.name, r.detail)).toEqual({
      title: "INGRESSO JÁ UTILIZADO",
      subtitle: "Maria Souza · Utilizado às 22:30",
    });
  });

  test("duplicidade sem hora conhecida ainda mostra o alerta", () => {
    const r = interpretCheckinRow(row({ result: "duplicidade", checked_in_at: null }), "ABC-1", "Modo Revoada");
    expect(overlayText(r.status, r.name, r.detail)).toEqual({ title: "INGRESSO JÁ UTILIZADO", subtitle: "Maria Souza" });
  });

  test("evento_passado mostra o evento de origem do ingresso, não o evento atual", () => {
    const r = interpretCheckinRow(row({ result: "evento_passado", event_title: "É O BEAT" }), "ABC-1", "Modo Revoada");
    expect(r.status).toBe("past_event");
    expect(r.eventName).toBe("Modo Revoada");
    expect(overlayText(r.status, r.name, r.detail)).toEqual({
      title: "INGRESSO DE EVENTO PASSADO",
      subtitle: "Maria Souza · Evento: É O BEAT",
    });
  });

  test("resultado desconhecido ou inválido nunca vira entrada", () => {
    for (const result of ["invalido", "algo_novo", ""]) {
      expect(interpretCheckinRow(row({ result, participant_name: null }), "ABC-1", "X").status).toBe("invalid");
    }
    expect(overlayText("invalid", "x").title).toBe("Ingresso inválido");
  });

  test("usa o código quando não há nome do participante", () => {
    expect(interpretCheckinRow(row({ result: "invalido", participant_name: null }), "ABC-1", "X").name).toBe("ABC-1");
  });

  test("vibração: alertas chamam atenção, entrada válida não vibra", () => {
    expect(vibrationFor("valid")).toBeNull();
    expect(vibrationFor("already_used")).not.toBeNull();
    expect(vibrationFor("past_event")).not.toBeNull();
    expect(vibrationFor("invalid")).not.toBeNull();
  });
});
