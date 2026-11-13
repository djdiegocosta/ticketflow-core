import { describe, expect, test } from "bun:test";
import { sortBatchesByPrice } from "./sort-batches";

describe("sortBatchesByPrice", () => {
  test("coloca o menor preço primeiro", () => {
    const batches = [
      { id: "premium", price: 35 },
      { id: "regular", price: 25 },
      { id: "middle", price: 30 },
    ];

    expect(sortBatchesByPrice(batches).map((batch) => batch.id)).toEqual([
      "regular", "middle", "premium",
    ]);
  });

  test("preserva a ordem original em caso de empate", () => {
    const batches = [
      { id: "first", price: 25 },
      { id: "second", price: 25 },
    ];

    expect(sortBatchesByPrice(batches).map((batch) => batch.id)).toEqual(["first", "second"]);
  });

  test("não altera a lista recebida e aceita lista vazia/ausente", () => {
    const batches = [{ id: "expensive", price: 40 }, { id: "cheap", price: 20 }];

    expect(sortBatchesByPrice(batches).map((batch) => batch.id)).toEqual(["cheap", "expensive"]);
    expect(batches.map((batch) => batch.id)).toEqual(["expensive", "cheap"]);
    expect(sortBatchesByPrice([])).toEqual([]);
    expect(sortBatchesByPrice(undefined)).toEqual([]);
  });
});
