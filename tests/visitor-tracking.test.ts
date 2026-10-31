import { describe, expect, test } from "bun:test";
import {
  getOrCreateVisitorId,
  isLikelyBot,
  isValidVisitorId,
  parseVisitSource,
  shouldTrackVisit,
} from "../src/lib/visitor-tracking";

const ID = "11111111-1111-4111-8111-111111111111";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe("identificador anônimo do visitante", () => {
  test("cria um id na primeira visita e guarda", () => {
    const store = fakeStorage();
    const id = getOrCreateVisitorId(store, () => ID);
    expect(id).toBe(ID);
    expect(store.data["tf_vid"]).toBe(ID);
  });

  test("reaproveita o mesmo id nas visitas seguintes (não gera outro)", () => {
    const store = fakeStorage({ tf_vid: ID });
    let calls = 0;
    const id = getOrCreateVisitorId(store, () => {
      calls++;
      return "22222222-2222-4222-8222-222222222222";
    });
    expect(id).toBe(ID);
    expect(calls).toBe(0);
  });

  test("valor corrompido no armazenamento é substituído por um id válido", () => {
    const store = fakeStorage({ tf_vid: "lixo; drop table" });
    const id = getOrCreateVisitorId(store, () => ID);
    expect(id).toBe(ID);
    expect(store.data["tf_vid"]).toBe(ID);
  });

  test("armazenamento bloqueado: devolve null e não quebra a página", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(getOrCreateVisitorId(blocked, () => ID)).toBeNull();
  });

  test("o id gerado pelo navegador é um UUID válido", () => {
    const id = getOrCreateVisitorId(fakeStorage());
    expect(isValidVisitorId(id)).toBe(true);
  });

  test("valida o formato do id", () => {
    expect(isValidVisitorId(ID)).toBe(true);
    expect(isValidVisitorId("abc")).toBe(false);
    expect(isValidVisitorId(null)).toBe(false);
    expect(isValidVisitorId(123)).toBe(false);
  });
});

describe("quem NÃO entra na contagem", () => {
  const instagram =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0";
  const chrome = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36";

  test("navegador do Instagram e Chrome normal são visitantes", () => {
    expect(isLikelyBot(instagram, false)).toBe(false);
    expect(isLikelyBot(chrome, false)).toBe(false);
  });

  test("robôs de busca, pré-visualização e automação são ignorados", () => {
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1)", false)).toBe(true);
    expect(isLikelyBot("WhatsApp/2.23 A", false)).toBe(true);
    expect(isLikelyBot("facebookexternalhit/1.1", false)).toBe(true);
    expect(isLikelyBot("HeadlessChrome/120", false)).toBe(true);
    expect(isLikelyBot(chrome, true)).toBe(true);
  });

  test("equipe interna (admin, colaborador, operador) não conta; cliente e visitante contam", () => {
    const base = { userAgent: chrome, webdriver: false, authLoading: false };
    expect(shouldTrackVisit({ ...base, role: "admin" })).toBe(false);
    expect(shouldTrackVisit({ ...base, role: "colaborador" })).toBe(false);
    expect(shouldTrackVisit({ ...base, role: "operador_checkin" })).toBe(false);
    expect(shouldTrackVisit({ ...base, role: "cliente" })).toBe(true);
    expect(shouldTrackVisit({ ...base, role: null })).toBe(true);
  });

  test("espera a autenticação carregar antes de decidir", () => {
    expect(shouldTrackVisit({ userAgent: chrome, webdriver: false, role: null, authLoading: true })).toBe(false);
  });
});

describe("origem da visita", () => {
  test("lê utm_*, normaliza em minúsculas e corta em 100 caracteres", () => {
    const long = "x".repeat(150);
    const s = parseVisitSource(`?utm_source=Instagram&utm_medium= BIO &utm_campaign=${long}`, "", "ticketflow-core.vercel.app");
    expect(s.utm_source).toBe("instagram");
    expect(s.utm_medium).toBe("bio");
    expect(s.utm_campaign).toBe("x".repeat(100));
  });

  test("referrer externo vira só o domínio, sem www", () => {
    const s = parseVisitSource("", "https://www.Instagram.com/ticketflow/p/abc?x=1", "ticketflow-core.vercel.app");
    expect(s.referrer_host).toBe("instagram.com");
  });

  test("navegação interna (vindo de /links ou do próprio site) não é origem", () => {
    const s = parseVisitSource("", "https://ticketflow-core.vercel.app/links", "ticketflow-core.vercel.app");
    expect(s.referrer_host).toBeNull();
    const s2 = parseVisitSource("", "https://www.ticketflow-core.vercel.app/links", "ticketflow-core.vercel.app");
    expect(s2.referrer_host).toBeNull();
  });

  test("referrer vazio ou inválido não quebra", () => {
    expect(parseVisitSource("", "", "a.com").referrer_host).toBeNull();
    expect(parseVisitSource("", "isso não é url", "a.com").referrer_host).toBeNull();
  });

  test("código do link de venda (?ref=) entra em minúsculas; vazio vira null", () => {
    expect(parseVisitSource("", "", "a.com", " Bio-IG ").link_code).toBe("bio-ig");
    expect(parseVisitSource("", "", "a.com", "").link_code).toBeNull();
    expect(parseVisitSource("", "", "a.com", undefined).link_code).toBeNull();
  });

  test("remove caracteres de controle e campos vazios viram null", () => {
    const s = parseVisitSource("?utm_source=%00%0Aabc&utm_medium=%20%20", "", "a.com");
    expect(s.utm_source).toBe("abc");
    expect(s.utm_medium).toBeNull();
    expect(s.utm_campaign).toBeNull();
  });
});
