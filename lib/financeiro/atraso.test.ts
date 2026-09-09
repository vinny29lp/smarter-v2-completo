import { describe, it, expect } from "vitest";
import { estaVencido, statusAposEditarVencimento, inicioDoDiaUTC } from "./atraso";

describe("estaVencido", () => {
  it("sem vencimentoAt nunca está vencido", () => {
    expect(estaVencido(null)).toBe(false);
    expect(estaVencido(undefined)).toBe(false);
  });

  it("vencimento no dia de hoje ainda NÃO está vencido (só a partir do dia seguinte)", () => {
    const hoje = new Date("2026-09-10T18:00:00.000Z");
    // vencimentoAt gravado ao meio-dia UTC do mesmo dia (convenção usada no formulário)
    expect(estaVencido("2026-09-10T12:00:00.000Z", hoje)).toBe(false);
    // mesmo à meia-noite UTC do mesmo dia
    expect(estaVencido("2026-09-10T00:00:00.000Z", hoje)).toBe(false);
  });

  it("vencimento de ontem já está vencido", () => {
    const hoje = new Date("2026-09-10T01:00:00.000Z"); // logo após virar o dia em UTC
    expect(estaVencido("2026-09-09T12:00:00.000Z", hoje)).toBe(true);
  });

  it("o caso real encontrado em produção: vencimento no futuro nunca está vencido, mesmo que o status atual diga o contrário", () => {
    const hoje = new Date("2026-09-08T12:00:00.000Z");
    expect(estaVencido("2026-09-20T12:00:00.000Z", hoje)).toBe(false);
  });

  it("data inválida não quebra — vira \"não vencido\"", () => {
    expect(estaVencido("não é uma data")).toBe(false);
  });
});

describe("statusAposEditarVencimento", () => {
  it("bug real de produção: VENCIDO com vencimento adiado pro futuro deve voltar pra PENDENTE", () => {
    const hoje = new Date("2026-09-08T12:00:00.000Z");
    expect(statusAposEditarVencimento("VENCIDO", "2026-09-20T12:00:00.000Z", hoje)).toBe("PENDENTE");
  });

  it("PENDENTE cujo novo vencimento já passou vira VENCIDO", () => {
    const hoje = new Date("2026-09-08T12:00:00.000Z");
    expect(statusAposEditarVencimento("PENDENTE", "2026-08-01T12:00:00.000Z", hoje)).toBe("VENCIDO");
  });

  it("quando o status já está correto pro novo vencimento, devolve null (não força update)", () => {
    const hoje = new Date("2026-09-08T12:00:00.000Z");
    expect(statusAposEditarVencimento("PENDENTE", "2026-09-20T12:00:00.000Z", hoje)).toBeNull();
    expect(statusAposEditarVencimento("VENCIDO", "2026-08-01T12:00:00.000Z", hoje)).toBeNull();
  });

  it("nunca mexe em PAGO ou CANCELADO", () => {
    const hoje = new Date("2026-09-08T12:00:00.000Z");
    expect(statusAposEditarVencimento("PAGO", "2026-01-01T12:00:00.000Z", hoje)).toBeNull();
    expect(statusAposEditarVencimento("CANCELADO", "2026-01-01T12:00:00.000Z", hoje)).toBeNull();
  });

  it("remover o vencimento (null) de um VENCIDO volta pra PENDENTE — sem data, não há como estar atrasado", () => {
    const hoje = new Date("2026-09-08T12:00:00.000Z");
    expect(statusAposEditarVencimento("VENCIDO", null, hoje)).toBe("PENDENTE");
  });
});

describe("inicioDoDiaUTC", () => {
  it("zera hora/minuto/segundo em UTC, preservando o dia-calendário", () => {
    const d = inicioDoDiaUTC(new Date("2026-09-10T23:59:59.999Z"));
    expect(d.toISOString()).toBe("2026-09-10T00:00:00.000Z");
  });
});
