import { describe, it, expect } from "vitest";
import { inicioSemana, visitasEsperadas, semaforoSemana, statusMarcos, semaforoGeral } from "./regras";

// 2026-11-25 é quarta-feira.
const quarta = new Date("2026-11-25T15:00:00Z");

describe("trilha dos 30 contratos", () => {
  it("semana começa na segunda 00:00 de Brasília", () => {
    expect(inicioSemana(quarta).toISOString()).toBe("2026-11-23T03:00:00.000Z");
  });
  it("domingo à noite (BRT) ainda é a semana que termina", () => {
    expect(inicioSemana(new Date("2026-11-30T01:00:00Z")).toISOString()).toBe("2026-11-23T03:00:00.000Z"); // domingo 22h BRT
    expect(inicioSemana(new Date("2026-11-30T03:00:00Z")).toISOString()).toBe("2026-11-30T03:00:00.000Z"); // segunda 00h BRT
  });
  it("esperado: segunda 0, quarta 4, sexta em diante 8..10", () => {
    expect(visitasEsperadas(new Date("2026-11-23T15:00:00Z"))).toBe(0);
    expect(visitasEsperadas(quarta)).toBe(4);
    expect(visitasEsperadas(new Date("2026-11-28T15:00:00Z"))).toBe(10);
  });
  it("semáforo semanal", () => {
    expect(semaforoSemana(4, quarta)).toBe("verde");
    expect(semaforoSemana(3, quarta)).toBe("amarelo");
    expect(semaforoSemana(1, quarta)).toBe("vermelho");
    expect(semaforoSemana(10, new Date("2026-11-28T15:00:00Z"))).toBe("verde");
    expect(semaforoSemana(0, new Date("2026-11-23T15:00:00Z"))).toBe("verde");
  });
  it("marcos", () => {
    const m = statusMarcos(60, 3);
    expect(m[0].status).toBe("atingido");
    expect(m[1].status).toBe("atrasado");
    expect(m[2].status).toBe("no_prazo");
    expect(semaforoGeral("verde", m)).toBe("vermelho");
    expect(semaforoGeral("amarelo", statusMarcos(10, 0))).toBe("amarelo");
  });
});
