import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  META_PIXEL_ID,
  buildAdvancedMatching,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  resetMetaAdvancedMatching,
  setMetaAdvancedMatching,
} from "../src/lib/meta-pixel";

describe("meta-pixel — normalização dos dados", () => {
  test("e-mail: minúsculo, sem espaços; inválido é descartado", () => {
    expect(normalizeEmail("  Maria.Silva@Gmail.COM ")).toBe("maria.silva@gmail.com");
    expect(normalizeEmail("maria@gmail")).toBeUndefined();
    expect(normalizeEmail("")).toBeUndefined();
    expect(normalizeEmail(null)).toBeUndefined();
  });

  test("telefone: só dígitos, com DDI 55", () => {
    expect(normalizePhone("(21) 99999-8888")).toBe("5521999998888");
    expect(normalizePhone("21 3333-4444")).toBe("552133334444");
    expect(normalizePhone("+55 (21) 99999-8888")).toBe("5521999998888");
    expect(normalizePhone("021999998888")).toBe("5521999998888");
  });

  test("telefone inválido ou incompleto é descartado", () => {
    expect(normalizePhone("99999")).toBeUndefined();
    expect(normalizePhone("")).toBeUndefined();
    expect(normalizePhone(undefined)).toBeUndefined();
  });

  test("nome: primeiro nome e último sobrenome, minúsculos e sem pontuação", () => {
    expect(normalizeName("Maria da Silva Santos")).toEqual({ fn: "maria", ln: "santos" });
    expect(normalizeName("  JOÃO   D'Ávila ")).toEqual({ fn: "joão", ln: "ávila" });
    expect(normalizeName("Ana")).toEqual({ fn: "ana" });
    expect(normalizeName("")).toEqual({});
    expect(normalizeName("1234 !!!")).toEqual({});
  });

  test("buildAdvancedMatching só inclui campos válidos", () => {
    expect(
      buildAdvancedMatching({ email: "A@B.com", phone: "(21) 99999-8888", name: "Maria Silva" }),
    ).toEqual({ em: "a@b.com", ph: "5521999998888", fn: "maria", ln: "silva" });
    expect(buildAdvancedMatching({ email: "x", phone: "1", name: "" })).toEqual({});
  });
});

describe("meta-pixel — envio ao Pixel (fbq init com 3º parâmetro)", () => {
  let calls: unknown[][];
  const g = globalThis as unknown as { window?: unknown };

  beforeEach(() => {
    calls = [];
    resetMetaAdvancedMatching();
    g.window = { fbq: (...args: unknown[]) => calls.push(args) };
  });
  afterEach(() => {
    delete g.window;
  });

  test("chama fbq('init', ID, dados) com os dados normalizados", () => {
    const sent = setMetaAdvancedMatching({
      email: "Maria@Gmail.com",
      phone: "(21) 99999-8888",
      name: "Maria Silva",
    });
    expect(sent).toBe(true);
    expect(calls).toEqual([
      [
        "init",
        META_PIXEL_ID,
        { em: "maria@gmail.com", ph: "5521999998888", fn: "maria", ln: "silva" },
      ],
    ]);
  });

  test("não envia nada sem dado válido", () => {
    expect(setMetaAdvancedMatching({ email: "ruim", phone: "1", name: "" })).toBe(false);
    expect(calls.length).toBe(0);
  });

  test("não repete o envio quando nada mudou", () => {
    const data = { email: "a@b.com", phone: "21999998888", name: "Ana Souza" };
    expect(setMetaAdvancedMatching(data)).toBe(true);
    expect(setMetaAdvancedMatching(data)).toBe(false);
    expect(calls.length).toBe(1);
  });

  test("mesma pessoa (mesmo telefone): confirmação completa com o e-mail do checkout", () => {
    setMetaAdvancedMatching({ email: "ana@b.com", phone: "21999998888", name: "Ana Souza" });
    // a confirmação da compra só recebe nome e telefone
    setMetaAdvancedMatching({ phone: "21999998888", name: "Ana Souza Lima" });
    expect(calls[1]).toEqual([
      "init",
      META_PIXEL_ID,
      { em: "ana@b.com", ph: "5521999998888", fn: "ana", ln: "lima" },
    ]);
  });

  test("outra pessoa no mesmo aparelho: substitui tudo, nunca mistura e-mails", () => {
    setMetaAdvancedMatching({ email: "ana@b.com", phone: "21999998888", name: "Ana Souza" });
    setMetaAdvancedMatching({ phone: "11988887777", name: "Bruno Costa" });
    expect(calls[1]).toEqual([
      "init",
      META_PIXEL_ID,
      { ph: "5511988887777", fn: "bruno", ln: "costa" },
    ]);
  });

  test("sem Pixel na página (bloqueador de anúncios): não faz nada e não dá erro", () => {
    g.window = {};
    expect(setMetaAdvancedMatching({ email: "a@b.com" })).toBe(false);
    delete g.window;
    expect(setMetaAdvancedMatching({ email: "a@b.com" })).toBe(false);
  });

  test("se o Pixel falhar por dentro, o checkout não é afetado", () => {
    g.window = {
      fbq: () => {
        throw new Error("pixel quebrou");
      },
    };
    expect(() => setMetaAdvancedMatching({ email: "a@b.com" })).not.toThrow();
    expect(setMetaAdvancedMatching({ email: "a@b.com" })).toBe(false);
  });
});
