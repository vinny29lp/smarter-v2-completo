import { describe, it, expect } from "vitest";
import { casarUnidade } from "./provisionarRegras";
const f = { id: "f1", name: "Smarter Niterói", cidade: "Niterói", uf: "RJ" };
describe("casarUnidade", () => {
  it("external_id vence", () => expect(casarUnidade(f, [{ id: "a", name: "X", external_id: "f1" }, { id: "b", name: "Smarter Niterói" }])?.id).toBe("a"));
  it("nome igual ignorando acento", () => expect(casarUnidade(f, [{ id: "b", name: "smarter niteroi" }])?.id).toBe("b"));
  it("cidade só se for única", () => {
    expect(casarUnidade(f, [{ id: "c", name: "Loja 1", city: "Niterói", state: "RJ" }])?.id).toBe("c");
    expect(casarUnidade(f, [{ id: "c", name: "Loja 1", city: "Niterói", state: "RJ" }, { id: "d", name: "Loja 2", city: "Niteroi", state: "rj" }])).toBeNull();
  });
  it("sem candidata → null", () => expect(casarUnidade(f, [{ id: "z", name: "Outra", city: "Cuiabá", state: "MT" }])).toBeNull());
});
