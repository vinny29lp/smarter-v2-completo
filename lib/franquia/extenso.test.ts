import { describe, it, expect } from "vitest";
import { reaisPorExtenso, formatarReais } from "./extenso";

describe("reais por extenso", () => {
  it("valores usados na rede", () => {
    expect(reaisPorExtenso(4500)).toBe("quatro mil e quinhentos reais");
    expect(reaisPorExtenso(17000)).toBe("dezessete mil reais");
    expect(reaisPorExtenso(6000)).toBe("seis mil reais");
    expect(reaisPorExtenso(25000)).toBe("vinte e cinco mil reais");
    expect(reaisPorExtenso(1500)).toBe("mil e quinhentos reais");
    expect(reaisPorExtenso(3250)).toBe("três mil duzentos e cinquenta reais".replace("mil duzentos", "mil, duzentos"));
  });
  it("centavos, 1 real e centenas", () => {
    expect(reaisPorExtenso(100)).toBe("cem reais");
    expect(reaisPorExtenso(1)).toBe("um real");
    expect(reaisPorExtenso(4500.5)).toBe("quatro mil e quinhentos reais e cinquenta centavos");
    expect(reaisPorExtenso(12345)).toBe("doze mil, trezentos e quarenta e cinco reais");
  });
  it("formata", () => { expect(formatarReais(4500)).toBe("R$ 4.500,00"); });
});
