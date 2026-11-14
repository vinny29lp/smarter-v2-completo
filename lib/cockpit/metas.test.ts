import { describe, it, expect } from "vitest";
import { sugerirMeta, progressoMeta, metaValida, mesValido } from "./metas";

describe("sugerirMeta", () => {
  it("sem histórico usa 3", () => expect(sugerirMeta([])).toBe(3));
  it("média +10% arredondada para cima", () => expect(sugerirMeta([4, 6, 5])).toBe(6));
  it("nunca menos que 1", () => expect(sugerirMeta([0, 0, 0])).toBe(1));
});

describe("progressoMeta", () => {
  const meio = new Date(Date.UTC(2026, 10, 15)); // 15/nov, 30 dias
  it("meta batida", () => {
    const p = progressoMeta(5, 6, meio);
    expect(p.ritmo).toBe("batida"); expect(p.falta).toBe(0); expect(p.pct).toBe(100);
  });
  it("no ritmo quando perto do esperado", () => expect(progressoMeta(10, 5, meio).ritmo).toBe("no_ritmo"));
  it("atrasada quando abaixo de 80% do esperado", () => expect(progressoMeta(10, 1, meio).ritmo).toBe("atrasada"));
  it("calcula falta e dias restantes", () => {
    const p = progressoMeta(10, 4, meio);
    expect(p.falta).toBe(6); expect(p.diasRestantes).toBe(15);
  });
});

describe("validações", () => {
  it("meta", () => { expect(metaValida(5)).toBe(true); expect(metaValida(0)).toBe(false); expect(metaValida("5")).toBe(false); expect(metaValida(501)).toBe(false); });
  it("mês", () => { expect(mesValido("2026-11")).toBe(true); expect(mesValido("2026-13")).toBe(false); expect(mesValido("nov")).toBe(false); });
});
