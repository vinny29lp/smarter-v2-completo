import { describe, it, expect } from "vitest";
import { filtrarLancamentosParaReconciliacao } from "./reconciliacao";

describe("filtrarLancamentosParaReconciliacao — regressão Perdeneiras (04/08/2026)", () => {
  it("exclui lançamentos vencendo no mês seguinte ao mês sendo fechado", () => {
    const lancamentos = [
      { status: "PENDENTE", cancelado: false, vencimentoAt: "2026-08-20T00:00:00.000Z" }, // agosto — não deve aparecer ao fechar julho
      { status: "PENDENTE", cancelado: false, vencimentoAt: "2026-08-10T00:00:00.000Z" },
    ];
    const resultado = filtrarLancamentosParaReconciliacao(lancamentos, 7, 2026);
    expect(resultado).toHaveLength(0);
  });

  it("inclui lançamentos vencendo dentro do mês sendo fechado", () => {
    const lancamentos = [
      { status: "PENDENTE", cancelado: false, vencimentoAt: "2026-07-20T00:00:00.000Z" },
      { status: "VENCIDO", cancelado: false, vencimentoAt: "2026-07-05T00:00:00.000Z" },
    ];
    const resultado = filtrarLancamentosParaReconciliacao(lancamentos, 7, 2026);
    expect(resultado).toHaveLength(2);
  });

  it("inclui atrasados de meses anteriores ao mês sendo fechado (ainda não resolvidos)", () => {
    const lancamentos = [
      { status: "VENCIDO", cancelado: false, vencimentoAt: "2026-05-10T00:00:00.000Z" },
    ];
    const resultado = filtrarLancamentosParaReconciliacao(lancamentos, 7, 2026);
    expect(resultado).toHaveLength(1);
  });

  it("exclui cancelados e status fora de PENDENTE/VENCIDO", () => {
    const lancamentos = [
      { status: "PAGO", cancelado: false, vencimentoAt: "2026-07-20T00:00:00.000Z" },
      { status: "PENDENTE", cancelado: true, vencimentoAt: "2026-07-20T00:00:00.000Z" },
      { status: "CANCELADO", cancelado: true, vencimentoAt: "2026-07-20T00:00:00.000Z" },
    ];
    expect(filtrarLancamentosParaReconciliacao(lancamentos, 7, 2026)).toHaveLength(0);
  });

  it("sem vencimentoAt, usa createdAt como referência de mês", () => {
    // Horário em meio-dia UTC para não cruzar fronteira de dia/mês em fusos locais.
    const lancamentos = [
      { status: "PENDENTE", cancelado: false, vencimentoAt: null, createdAt: "2026-08-15T12:00:00.000Z" }, // agosto — fora
      { status: "PENDENTE", cancelado: false, vencimentoAt: null, createdAt: "2026-07-15T12:00:00.000Z" }, // julho — dentro
    ];
    const resultado = filtrarLancamentosParaReconciliacao(lancamentos, 7, 2026);
    expect(resultado).toHaveLength(1);
  });

  it("sem vencimentoAt nem createdAt, entra por segurança (não perde item sem data)", () => {
    const lancamentos = [{ status: "PENDENTE", cancelado: false, vencimentoAt: null, createdAt: null }];
    expect(filtrarLancamentosParaReconciliacao(lancamentos, 7, 2026)).toHaveLength(1);
  });

  it("cenário real Perdeneiras: 6 itens de agosto ao fechar julho → 0 aparecem", () => {
    const lancamentos = [
      { status: "PENDENTE", cancelado: false, vencimentoAt: "2026-08-20T00:00:00.000Z" },
      { status: "PENDENTE", cancelado: false, vencimentoAt: "2026-08-10T00:00:00.000Z" },
      { status: "PENDENTE", cancelado: false, vencimentoAt: "2026-08-20T00:00:00.000Z" },
      { status: "PENDENTE", cancelado: false, vencimentoAt: "2026-08-20T00:00:00.000Z" },
      { status: "PENDENTE", cancelado: false, vencimentoAt: "2026-08-20T00:00:00.000Z" },
      { status: "PENDENTE", cancelado: false, vencimentoAt: "2026-08-20T00:00:00.000Z" },
    ];
    expect(filtrarLancamentosParaReconciliacao(lancamentos, 7, 2026)).toHaveLength(0);
  });
});
