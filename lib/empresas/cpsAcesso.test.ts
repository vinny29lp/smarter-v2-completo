import { describe, it, expect } from "vitest";
import { podeOperarCps } from "./cpsAcesso";
const u = { role: "FRANQUEADO", franchiseId: "f1" };
describe("podeOperarCps", () => {
  it("própria unidade e franqueadora", () => {
    expect(podeOperarCps({ franchiseId: "f1" }, u)).toBe(true);
    expect(podeOperarCps({ franchiseId: "f2" }, { role: "FRANQUEADORA" })).toBe(true);
  });
  it("migrada sem unidade: unidade pode", () => {
    expect(podeOperarCps({ franchiseId: null, origem: "MIGRADO" }, u)).toBe(true);
    expect(podeOperarCps({ franchiseId: null, origem: "MIGRADO" }, { role: "FUNCIONARIO", franchiseId: "f1" })).toBe(true);
  });
  it("empresa de outra unidade ou sem unidade não migrada: não", () => {
    expect(podeOperarCps({ franchiseId: "f2", origem: "MIGRADO" }, u)).toBe(false);
    expect(podeOperarCps({ franchiseId: null, origem: "NORMAL" }, u)).toBe(false);
    expect(podeOperarCps({ franchiseId: null, origem: "MIGRADO" }, { role: "ESTUDANTE", franchiseId: "f1" })).toBe(false);
    expect(podeOperarCps({ franchiseId: null, origem: "MIGRADO" }, { role: "FRANQUEADO", franchiseId: null })).toBe(false);
  });
});
