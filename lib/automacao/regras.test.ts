import { describe, it, expect } from "vitest";
import { marcoRenovacao, marcoAvaliacao, deveLembrarAssinatura, limiteDeDoisAnos, emailValido } from "./regras";
import { tokenOptOut, tokenOptOutValido } from "./token";

describe("marcoRenovacao (#17)", () => {
  it("escolhe o menor marco ainda não ultrapassado", () => {
    expect(marcoRenovacao(120)).toBeNull();
    expect(marcoRenovacao(90)).toBe(90);
    expect(marcoRenovacao(85)).toBe(90);
    expect(marcoRenovacao(60)).toBe(60);
    expect(marcoRenovacao(45)).toBe(60);
    expect(marcoRenovacao(30)).toBe(30);
    expect(marcoRenovacao(5)).toBe(30);
  });
  it("contrato já vencido não entra na renovação", () => {
    expect(marcoRenovacao(-1)).toBeNull();
  });
  it("detecta estágio que bate o limite de 2 anos", () => {
    expect(limiteDeDoisAnos(new Date("2024-01-01"), new Date("2026-01-01"))).toBe(true);
    expect(limiteDeDoisAnos(new Date("2025-01-01"), new Date("2026-01-01"))).toBe(false);
  });
});

describe("marcoAvaliacao (#19)", () => {
  it("dispara só dentro da janela de 14 dias após 30/90/180", () => {
    expect(marcoAvaliacao(29)).toBeNull();
    expect(marcoAvaliacao(30)).toBe(30);
    expect(marcoAvaliacao(44)).toBe(30);
    expect(marcoAvaliacao(45)).toBeNull();
    expect(marcoAvaliacao(95)).toBe(90);
    expect(marcoAvaliacao(181)).toBe(180);
    expect(marcoAvaliacao(400)).toBeNull();
  });
});

describe("deveLembrarAssinatura (#14)", () => {
  it("não lembra cedo demais nem de documento muito antigo", () => {
    expect(deveLembrarAssinatura({ idadeDocDias: 1, lembretesAnteriores: 0, diasDesdeUltimoLembrete: null })).toBe(false);
    expect(deveLembrarAssinatura({ idadeDocDias: 90, lembretesAnteriores: 0, diasDesdeUltimoLembrete: null })).toBe(false);
  });
  it("primeiro lembrete com 2+ dias, depois a cada 3 dias", () => {
    expect(deveLembrarAssinatura({ idadeDocDias: 2, lembretesAnteriores: 0, diasDesdeUltimoLembrete: null })).toBe(true);
    expect(deveLembrarAssinatura({ idadeDocDias: 5, lembretesAnteriores: 1, diasDesdeUltimoLembrete: 2 })).toBe(false);
    expect(deveLembrarAssinatura({ idadeDocDias: 6, lembretesAnteriores: 1, diasDesdeUltimoLembrete: 3 })).toBe(true);
  });
  it("para depois de 4 lembretes", () => {
    expect(deveLembrarAssinatura({ idadeDocDias: 20, lembretesAnteriores: 4, diasDesdeUltimoLembrete: 10 })).toBe(false);
  });
});

describe("opt-out", () => {
  it("token só vale para o e-mail certo, ignorando maiúsculas", () => {
    const t = tokenOptOut("Maria@Empresa.com");
    expect(tokenOptOutValido("maria@empresa.com", t)).toBe(true);
    expect(tokenOptOutValido("outra@empresa.com", t)).toBe(false);
    expect(tokenOptOutValido("maria@empresa.com", "x")).toBe(false);
  });
  it("valida e-mail", () => {
    expect(emailValido("a@b.com")).toBe(true);
    expect(emailValido("sem-arroba")).toBe(false);
    expect(emailValido("")).toBe(false);
  });
});
