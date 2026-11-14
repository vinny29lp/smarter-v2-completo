import { describe, it, expect } from "vitest";
import { reviverLinha, expiraEm, expirada, DIAS_RETENCAO_LIXEIRA } from "./lixeira-util";

describe("lixeira-util", () => {
  it("restaura datas ISO e remove nulos", () => {
    const l = reviverLinha({ id: "a", criado: "2026-11-13T12:00:00.000Z", nome: "x", vazio: null, texto: "2026-11-13" });
    expect(l.criado).toBeInstanceOf(Date);
    expect(l.vazio).toBeUndefined();
    expect(l.texto).toBe("2026-11-13");
    expect(l.nome).toBe("x");
  });
  it("retenção de 90 dias", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    expect(expiraEm(base).getTime() - base.getTime()).toBe(DIAS_RETENCAO_LIXEIRA * 86_400_000);
    expect(expirada(expiraEm(base), new Date("2026-02-01T00:00:00Z"))).toBe(false);
    expect(expirada(expiraEm(base), new Date("2026-06-01T00:00:00Z"))).toBe(true);
  });
});
