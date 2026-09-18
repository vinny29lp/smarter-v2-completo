import { describe, it, expect } from "vitest";
import { competenciaDeData } from "./competencia";

describe("competenciaDeData", () => {
  it("formata YYYY-MM a partir dos componentes UTC da data", () => {
    expect(competenciaDeData(new Date("2026-09-20T12:00:00.000Z"))).toBe("2026-09");
  });

  it("mês de um dígito vem com zero à esquerda", () => {
    expect(competenciaDeData(new Date("2026-01-05T00:00:00.000Z"))).toBe("2026-01");
  });

  it("usa o dia-calendário UTC, não a hora local — meio-dia UTC do último dia do mês continua no mesmo mês", () => {
    expect(competenciaDeData(new Date("2026-08-31T23:59:59.000Z"))).toBe("2026-08");
  });
});
