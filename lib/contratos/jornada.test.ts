import { describe, it, expect } from "vitest";
import {
  getDiasCount,
  calcBlocoCh,
  blocosDoContrato,
  serializarBlocos,
} from "./jornada";

describe("getDiasCount", () => {
  it("conta um range simples (sem volta de semana)", () => {
    expect(getDiasCount(0, 4)).toBe(5); // Segunda a Sexta
  });

  it("conta um range com volta ao início da semana", () => {
    expect(getDiasCount(4, 1)).toBe(5); // Sexta, Sábado, Domingo, Segunda, Terça
  });

  it("um único dia conta como 1", () => {
    expect(getDiasCount(5, 5)).toBe(1); // só Sábado
  });
});

describe("calcBlocoCh", () => {
  it("calcula horas líquidas descontando o intervalo", () => {
    expect(calcBlocoCh({ inicio: "08:00", fim: "14:00", intervalo: 0 })).toBe(6);
    expect(calcBlocoCh({ inicio: "08:00", fim: "14:00", intervalo: 60 })).toBe(5);
  });

  it("nunca retorna negativo", () => {
    expect(calcBlocoCh({ inicio: "14:00", fim: "08:00", intervalo: 0 })).toBe(0);
  });
});

describe("blocosDoContrato", () => {
  it("formato A (blocos estruturados): retorna os blocos como estão", () => {
    const diasSemana = JSON.stringify([
      { de: 0, ate: 4, inicio: "08:00", fim: "14:00", intervalo: 0 },
      { de: 5, ate: 5, inicio: "11:00", fim: "15:00", intervalo: 0 },
    ]);
    const blocos = blocosDoContrato({ diasSemana, horarioInicio: "08:00", horarioFim: "14:00", intervalo: 0 });
    expect(blocos).toHaveLength(2);
    expect(blocos[1]).toEqual({ de: 5, ate: 5, inicio: "11:00", fim: "15:00", intervalo: 0 });
  });

  it("formato B (turnos legados por texto): 1 bloco por turno, range aproximado", () => {
    const diasSemana = JSON.stringify([
      { dias: "Segunda a Sexta", inicio: "08:00", fim: "14:00" },
      { dias: "Sábado", inicio: "09:00", fim: "13:00" },
    ]);
    const blocos = blocosDoContrato({ diasSemana, horarioInicio: null, horarioFim: null, intervalo: null });
    expect(blocos).toHaveLength(2);
    expect(blocos[0]).toEqual({ de: 0, ate: 4, inicio: "08:00", fim: "14:00", intervalo: 0 });
    expect(blocos[1]).toEqual({ de: 5, ate: 5, inicio: "09:00", fim: "13:00", intervalo: 0 });
  });

  it("formato C (preset simples): 1 bloco só, usando o horário único do contrato — compatibilidade com contratos antigos", () => {
    const blocos = blocosDoContrato({
      diasSemana: "Segunda a Sexta",
      horarioInicio: "08:30",
      horarioFim: "14:30",
      intervalo: 15,
    });
    expect(blocos).toEqual([{ de: 0, ate: 4, inicio: "08:30", fim: "14:30", intervalo: 15 }]);
  });

  it("formato C com range que volta ao início da semana", () => {
    const blocos = blocosDoContrato({
      diasSemana: "Sexta a Terça",
      horarioInicio: "10:00",
      horarioFim: "16:00",
      intervalo: 0,
    });
    expect(blocos[0]).toEqual({ de: 4, ate: 1, inicio: "10:00", fim: "16:00", intervalo: 0 });
  });

  it("diasSemana vazio cai no fallback padrão (segunda a sexta)", () => {
    const blocos = blocosDoContrato({ diasSemana: "", horarioInicio: "08:00", horarioFim: "14:00", intervalo: 0 });
    expect(blocos).toEqual([{ de: 0, ate: 4, inicio: "08:00", fim: "14:00", intervalo: 0 }]);
  });
});

describe("serializarBlocos", () => {
  it("faz o round-trip com blocosDoContrato (formato A)", () => {
    const blocos = [
      { de: 0, ate: 4, inicio: "08:00", fim: "14:00", intervalo: 0 },
      { de: 5, ate: 5, inicio: "11:00", fim: "15:00", intervalo: 30 },
    ];
    const serializado = serializarBlocos(blocos);
    const reconstruido = blocosDoContrato({ diasSemana: serializado });
    expect(reconstruido).toEqual(blocos);
  });
});
