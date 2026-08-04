import { describe, it, expect } from "vitest";
import { mesAnteriorDe, precisaFecharMesAnterior, computeMesStatusFlags } from "./gate";

describe("mesAnteriorDe", () => {
  it("volta um mês dentro do mesmo ano", () => {
    expect(mesAnteriorDe(8, 2026)).toEqual({ mes: 7, ano: 2026 });
  });

  it("trata virada de ano: janeiro aponta para dezembro do ano anterior", () => {
    expect(mesAnteriorDe(1, 2026)).toEqual({ mes: 12, ano: 2025 });
  });
});

describe("precisaFecharMesAnterior", () => {
  it("falso quando o mês anterior nunca foi aberto", () => {
    expect(precisaFecharMesAnterior({ existe: false, fechada: false })).toBe(false);
  });

  it("falso quando o mês anterior foi aberto E fechado", () => {
    expect(precisaFecharMesAnterior({ existe: true, fechada: true })).toBe(false);
  });

  it("verdadeiro quando o mês anterior foi aberto mas não fechado — o estado 'preso'", () => {
    expect(precisaFecharMesAnterior({ existe: true, fechada: false })).toBe(true);
  });
});

describe("computeMesStatusFlags — regressão: unidade com mês anterior pendente", () => {
  it("unidade que abriu o mês anterior e não fechou vê mesAnteriorPendente=true e fica bloqueada, mesmo antes do dia 5", () => {
    const flags = computeMesStatusFlags({
      dia: 3,
      aberturaAtualExiste: false,
      aberturaAnterior: { existe: true, fechada: false },
    });
    expect(flags.mesAnteriorPendente).toBe(true);
    expect(flags.bloqueado).toBe(true);
    expect(flags.deveAbrir).toBe(true);
  });

  it("unidade em dia (mês anterior fechado, ainda dentro do prazo) não fica bloqueada", () => {
    const flags = computeMesStatusFlags({
      dia: 3,
      aberturaAtualExiste: false,
      aberturaAnterior: { existe: true, fechada: true },
    });
    expect(flags.mesAnteriorPendente).toBe(false);
    expect(flags.bloqueado).toBe(false);
  });

  it("unidade que nunca abriu o mês anterior (não é o caso 'preso') só bloqueia pelo prazo normal (dia >= 5)", () => {
    const antesDoPrazo = computeMesStatusFlags({
      dia: 3,
      aberturaAtualExiste: false,
      aberturaAnterior: { existe: false, fechada: false },
    });
    expect(antesDoPrazo.mesAnteriorPendente).toBe(false);
    expect(antesDoPrazo.bloqueado).toBe(false);

    const depoisDoPrazo = computeMesStatusFlags({
      dia: 6,
      aberturaAtualExiste: false,
      aberturaAnterior: { existe: false, fechada: false },
    });
    expect(depoisDoPrazo.bloqueado).toBe(true);
  });

  it("mês atual já aberto e mês anterior fechado: nunca bloqueado, independente do dia", () => {
    const flags = computeMesStatusFlags({
      dia: 20,
      aberturaAtualExiste: true,
      aberturaAnterior: { existe: true, fechada: true },
    });
    expect(flags.bloqueado).toBe(false);
    expect(flags.deveAbrir).toBe(false);
  });

  it("mesmo com o mês atual já aberto, mês anterior pendente ainda bloqueia (estado inconsistente que precisa ser sinalizado)", () => {
    const flags = computeMesStatusFlags({
      dia: 20,
      aberturaAtualExiste: true,
      aberturaAnterior: { existe: true, fechada: false },
    });
    expect(flags.mesAnteriorPendente).toBe(true);
    expect(flags.bloqueado).toBe(true);
  });
});
