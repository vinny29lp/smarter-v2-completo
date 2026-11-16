import { describe, it, expect } from "vitest";
import { janelaTreinamento, DIAS_TREINAMENTO } from "./janela";

describe("janelaTreinamento", () => {
  it("franquia nova conta 90 dias da criação", () => {
    const criada = new Date("2026-12-01T12:00:00Z");
    expect(janelaTreinamento(criada, new Date("2027-02-01T12:00:00Z")).ativo).toBe(true);
    expect(janelaTreinamento(criada, new Date("2027-03-05T12:00:00Z")).ativo).toBe(false);
  });
  it("unidade antiga conta do lançamento", () => {
    const j = janelaTreinamento(new Date("2023-01-01"), new Date("2026-12-16T12:00:00Z"));
    expect(j.ativo).toBe(true);
    expect(j.diasRestantes).toBeGreaterThan(DIAS_TREINAMENTO - 40);
  });
  it("sem data usa o lançamento", () => {
    expect(janelaTreinamento(null, new Date("2026-11-17T12:00:00Z")).ativo).toBe(true);
  });
});
