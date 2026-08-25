import { describe, it, expect } from "vitest";
import {
  diaDoMes,
  diasTotaisEntre,
  mesesCompletos,
  mesesComFracao15Dias,
  calcularRecessoProporcional,
  calcularRescisao,
} from "./rescisaoCalc";

describe("diaDoMes", () => {
  it("retorna o dia do mês da data de referência", () => {
    expect(diaDoMes(new Date("2026-03-15"))).toBe(15);
  });

  it("cobre o último dia de um mês de 31 dias", () => {
    expect(diaDoMes(new Date("2026-01-31"))).toBe(31);
  });
});

describe("diasTotaisEntre", () => {
  it("conta os dois extremos (inclusive)", () => {
    expect(diasTotaisEntre(new Date("2026-01-01"), new Date("2026-01-31"))).toBe(31);
  });

  it("mesmo dia conta como 1 dia trabalhado", () => {
    expect(diasTotaisEntre(new Date("2026-01-01"), new Date("2026-01-01"))).toBe(1);
  });

  it("nunca retorna negativo se fim vier antes do início", () => {
    expect(diasTotaisEntre(new Date("2026-02-01"), new Date("2026-01-01"))).toBe(0);
  });
});

describe("mesesCompletos", () => {
  it("conta meses cheios respeitando o dia do mês", () => {
    // 15/01/2025 -> 14/02/2026: falta 1 dia para fechar o 13º mês
    expect(mesesCompletos(new Date("2025-01-15"), new Date("2026-02-14"))).toBe(12);
    // 15/01/2025 -> 15/02/2026: fecha o 13º mês exatamente
    expect(mesesCompletos(new Date("2025-01-15"), new Date("2026-02-15"))).toBe(13);
  });

  it("exatos 12 meses batendo o dia", () => {
    expect(mesesCompletos(new Date("2025-01-15"), new Date("2026-01-15"))).toBe(12);
  });

  it("um dia antes de completar 12 meses ainda conta 11", () => {
    expect(mesesCompletos(new Date("2025-01-15"), new Date("2026-01-14"))).toBe(11);
  });

  it("período menor que 1 mês retorna 0", () => {
    expect(mesesCompletos(new Date("2026-03-01"), new Date("2026-03-20"))).toBe(0);
  });
});

describe("mesesComFracao15Dias", () => {
  it("fração >= 15 dias conta como avo cheio", () => {
    // 6 meses completos (15/01 -> 15/07) + 15 dias (até 30/07) = 7 avos
    expect(mesesComFracao15Dias(new Date("2026-01-15"), new Date("2026-07-30"))).toBe(7);
  });

  it("fração < 15 dias não conta", () => {
    // 6 meses completos + 14 dias (até 29/07) = continua 6 avos
    expect(mesesComFracao15Dias(new Date("2026-01-15"), new Date("2026-07-29"))).toBe(6);
  });

  it("exatamente 15 dias de fração já conta (limite inclusive)", () => {
    expect(mesesComFracao15Dias(new Date("2026-01-01"), new Date("2026-02-16"))).toBe(2); // 1 mês + 15 dias
    expect(mesesComFracao15Dias(new Date("2026-01-01"), new Date("2026-02-15"))).toBe(1); // 1 mês + 14 dias
  });

  it("sem meses completos, só a fração inicial", () => {
    expect(mesesComFracao15Dias(new Date("2026-03-01"), new Date("2026-03-16"))).toBe(1); // 15 dias corridos
    expect(mesesComFracao15Dias(new Date("2026-03-01"), new Date("2026-03-15"))).toBe(0); // 14 dias corridos
  });
});

describe("calcularRecessoProporcional", () => {
  it("proporcional normal: menos de 12 meses usa os avos pela regra dos 15 dias", () => {
    const r = calcularRecessoProporcional(new Date("2026-01-15"), new Date("2026-07-15"));
    expect(r.avos).toBe(6);
    expect(r.dias).toBe(15); // 6 * 2.5
    expect(r.regraEspecialAplicada).toBe(false);
  });

  it("fração de 15+ dias soma mais 1 avo", () => {
    const r = calcularRecessoProporcional(new Date("2026-01-15"), new Date("2026-07-30"));
    expect(r.avos).toBe(7);
    expect(r.dias).toBe(17.5); // 7 * 2.5
    expect(r.regraEspecialAplicada).toBe(false);
  });

  it("regra especial: 12 avos completos sem recesso vira 14 avos", () => {
    const r = calcularRecessoProporcional(new Date("2025-01-15"), new Date("2026-01-15"));
    expect(r.avos).toBe(14);
    expect(r.dias).toBe(35); // 14 * 2.5
    expect(r.regraEspecialAplicada).toBe(true);
  });

  it("sem nenhum mês completo e fração < 15 dias não gera recesso", () => {
    const r = calcularRecessoProporcional(new Date("2026-03-01"), new Date("2026-03-10"));
    expect(r.avos).toBe(0);
    expect(r.dias).toBe(0);
    expect(r.regraEspecialAplicada).toBe(false);
  });
});

describe("calcularRescisao", () => {
  it("cenário completo sem recesso prévio e sem descontos", () => {
    const c = calcularRescisao({
      dataInicioContrato: "2025-06-10",
      bolsaMensal: 1200,
      ultimoDia: "2026-06-20",
    });
    expect(c.diasBolsa).toBe(20);
    expect(c.bolsaProporcional).toBeCloseTo((1200 / 30) * 20, 5);
    expect(c.mesesTrabalhados).toBe(12); // 10/06/25 -> 10/06/26 fecharia 12; 20/06/26 já passou o dia
    expect(c.regraEspecialAplicada).toBe(true); // já passou 1 ano sem recesso
    expect(c.avosRecesso).toBe(14);
    expect(c.diasRecesso).toBe(35);
    expect(c.recessoValor).toBeCloseTo((1200 / 30) * 35, 5);
    expect(c.totalDescontos).toBe(0);
    expect(c.totalBruto).toBeCloseTo(c.bolsaProporcional + c.recessoValor, 5);
    expect(c.totalLiquido).toBeCloseTo(c.totalBruto, 5);
  });

  it("abate descontos do total líquido", () => {
    const c = calcularRescisao({
      dataInicioContrato: "2026-01-10",
      bolsaMensal: 900,
      ultimoDia: "2026-04-10",
      descontos: 50,
    });
    expect(c.totalDescontos).toBe(50);
    expect(c.totalLiquido).toBeCloseTo(c.totalBruto - 50, 5);
  });

  it("reinicia a contagem de avos a partir do dia seguinte a um recesso já concedido", () => {
    const c = calcularRescisao({
      dataInicioContrato: "2024-01-10",
      bolsaMensal: 1000,
      ultimoDia: "2026-01-10",
      recessoJaTiradoAte: "2025-01-10",
    });
    // base do recesso passa a ser 2025-01-11; 11 meses completos (até 11/12/2025)
    // + 30 dias de fração (11/12/2025 -> 10/01/2026) já são >=15 dias, então
    // pela regra dos 15 dias isso fecha o 12º avo — e como bateu 12 avos sem o
    // recesso ser retirado nesse intervalo, a regra especial (14/12) entra.
    expect(c.baseCalculoRecesso.toISOString().slice(0, 10)).toBe("2025-01-11");
    expect(c.regraEspecialAplicada).toBe(true);
    expect(c.avosRecesso).toBe(14);
    // "diasTrabalhados"/"mesesTrabalhados" continuam medindo o estágio inteiro, não o recesso
    expect(c.mesesTrabalhados).toBe(24);
  });
});
