import { describe, it, expect } from "vitest";
import { montarTarefas, resumoTarefas, assinaturaTarefas } from "./tarefas";

const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));

describe("montarTarefas", () => {
  it("sem alertas devolve lista vazia", () => {
    expect(montarTarefas(null)).toEqual([]);
    expect(montarTarefas({ contratosVencendo: [] })).toEqual([]);
  });
  it("críticos vêm antes dos de atenção, e dentro do grupo, maior quantidade primeiro", () => {
    const r = montarTarefas({
      contratosVencendo: mk(9), contratosPendentes2Mes: mk(1), contratosVencidosSemFinalizar: mk(4), leadsCrmVencidos: mk(2),
    });
    expect(r.map(x => x.id)).toEqual(["vencidos", "pend60", "vencendo", "crm"]);
  });
  it("financeiro:false omite cobrança de gestão", () => {
    const a = { contratosGestaoSemCobertura: mk(3) };
    expect(montarTarefas(a, { financeiro: false })).toEqual([]);
    expect(montarTarefas(a)).toHaveLength(1);
  });
  it("resumo e assinatura refletem as quantidades", () => {
    const r = montarTarefas({ contratosPendentes2Mes: mk(2), contratosVencendo: mk(5) });
    expect(resumoTarefas(r)).toEqual({ criticas: 2, atencao: 5 });
    expect(assinaturaTarefas(r)).toBe("pend60:2|vencendo:5");
  });
});
