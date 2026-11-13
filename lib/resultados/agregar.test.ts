import { describe, it, expect } from "vitest";
import { mesesRecentes, contarPorMes, mediaDias, variacaoPct } from "./agregar";

describe("resultados", () => {
  it("mesesRecentes cruza o ano", () => {
    expect(mesesRecentes(4, new Date("2026-02-15T00:00:00Z"))).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
  it("contarPorMes ignora datas fora da janela e nulas", () => {
    const m = ["2026-09", "2026-10", "2026-11"];
    expect(contarPorMes([new Date("2026-10-03"), new Date("2026-10-20"), new Date("2026-11-01"), new Date("2025-01-01"), null], m)).toEqual([0, 2, 1]);
  });
  it("mediaDias", () => {
    expect(mediaDias([{ de: new Date("2026-01-01"), ate: new Date("2026-01-05") }, { de: new Date("2026-01-01"), ate: new Date("2026-01-03") }])).toBe(3);
    expect(mediaDias([])).toBeNull();
  });
  it("variacaoPct", () => {
    expect(variacaoPct(15, 10)).toBe(50);
    expect(variacaoPct(0, 0)).toBe(0);
    expect(variacaoPct(3, 0)).toBeNull();
  });
});
