import { describe, expect, test } from "bun:test";
import { normalizeSearchText, saleMatchesSearch } from "../src/lib/sales-search";

const sales = [
  { buyer_name: "Maria da Silva", buyer_whatsapp: "(21) 99999-8888", sale_code: "TF-A1B2" },
  { buyer_name: "João Pedro Alves", buyer_whatsapp: "(21) 98888-7777", sale_code: "TF-C3D4" },
  { buyer_name: "Ana Souza", buyer_whatsapp: "(11) 97777-6666", sale_code: "TF-E5F6" },
  { buyer_name: "Bruno Costa", buyer_whatsapp: null, sale_code: null },
];
const search = (term: string) =>
  sales.filter((s) => saleMatchesSearch(s, term)).map((s) => s.buyer_name);

// Regra ANTIGA (com o defeito), mantida aqui só para provar a regressão.
const oldRule = (s: (typeof sales)[number], rawTerm: string) => {
  const term = rawTerm.trim().toLowerCase();
  const phone = (s.buyer_whatsapp ?? "").replace(/\D/g, "");
  return (
    !term ||
    s.buyer_name.toLowerCase().includes(term) ||
    phone.includes(term.replace(/\D/g, "")) ||
    (s.sale_code || "").toLowerCase().includes(term)
  );
};

describe("busca em Vendas", () => {
  test("REGRESSÃO: a regra antiga devolvia todas as vendas ao buscar por nome", () => {
    expect(sales.filter((s) => oldRule(s, "maria")).length).toBe(sales.length);
  });

  test("buscar por nome devolve só quem tem aquele nome", () => {
    expect(search("maria")).toEqual(["Maria da Silva"]);
    expect(search("costa")).toEqual(["Bruno Costa"]);
  });

  test("ignora maiúsculas e acentos", () => {
    expect(search("JOAO")).toEqual(["João Pedro Alves"]);
    expect(search("joão")).toEqual(["João Pedro Alves"]);
    expect(search("  ana  ")).toEqual(["Ana Souza"]);
  });

  test("várias palavras: todas precisam aparecer, mesmo com 'da/de' no meio", () => {
    expect(search("maria silva")).toEqual(["Maria da Silva"]);
    expect(search("pedro joao")).toEqual(["João Pedro Alves"]);
    expect(search("maria alves")).toEqual([]);
  });

  test("nome que não existe não devolve ninguém", () => {
    expect(search("fulano")).toEqual([]);
  });

  test("código da venda", () => {
    expect(search("tf-c3d4")).toEqual(["João Pedro Alves"]);
    expect(search("A1B2")).toEqual(["Maria da Silva"]);
  });

  test("WhatsApp: com ou sem máscara, inteiro ou parcial", () => {
    expect(search("(21) 99999-8888")).toEqual(["Maria da Silva"]);
    expect(search("999998888")).toEqual(["Maria da Silva"]);
    expect(search("98888-7")).toEqual(["João Pedro Alves"]);
    expect(search("(11)")).toEqual(["Ana Souza"]);
  });

  test("código com números não sai casando telefones por engano", () => {
    // antes, "TF-12" virava "12" e casava com qualquer telefone que tivesse 12
    expect(search("tf-12")).toEqual([]);
  });

  test("busca vazia mostra todos; venda sem WhatsApp ou sem código não quebra", () => {
    expect(search("").length).toBe(4);
    expect(search("   ").length).toBe(4);
    expect(() => search("21999")).not.toThrow();
  });

  test("normalizeSearchText", () => {
    expect(normalizeSearchText("  JOÃO   D'Ávila ")).toBe("joao d'avila");
    expect(normalizeSearchText(null)).toBe("");
  });
});
