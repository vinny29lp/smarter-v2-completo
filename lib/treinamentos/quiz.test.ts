import { describe, it, expect } from "vitest";
import { BANCO, sortearPerguntas, corrigir, semGabarito, MIN_ACERTOS, TOTAL_PERGUNTAS } from "./quiz";

const certas = (n: number) => sortearPerguntas().map((p, i) => ({ id: p.id, escolha: i < n ? p.correta : (p.correta + 1) % p.opcoes.length }));

describe("quiz do treinamento inicial", () => {
  it("banco tem ids únicos e gabarito válido", () => {
    expect(new Set(BANCO.map(p => p.id)).size).toBe(BANCO.length);
    for (const p of BANCO) { expect(p.correta).toBeGreaterThanOrEqual(0); expect(p.correta).toBeLessThan(p.opcoes.length); }
  });
  it("sorteia 10 perguntas distintas", () => {
    const s = sortearPerguntas();
    expect(s).toHaveLength(TOTAL_PERGUNTAS);
    expect(new Set(s.map(p => p.id)).size).toBe(TOTAL_PERGUNTAS);
  });
  it("versão do cliente não expõe a resposta", () => {
    expect(JSON.stringify(semGabarito(BANCO[0]))).not.toContain("correta");
  });
  it("8 acertos aprova, 7 reprova", () => {
    expect(corrigir(certas(MIN_ACERTOS))?.aprovado).toBe(true);
    expect(corrigir(certas(MIN_ACERTOS - 1))?.aprovado).toBe(false);
    expect(corrigir(certas(10))?.acertos).toBe(10);
  });
  it("rejeita payload inválido, repetido ou incompleto", () => {
    expect(corrigir(null)).toBeNull();
    expect(corrigir([])).toBeNull();
    const r = certas(10); r[1] = { ...r[0] };
    expect(corrigir(r)).toBeNull();
    const r2 = certas(10); r2[0] = { id: "zzz", escolha: 0 };
    expect(corrigir(r2)).toBeNull();
    const r3 = certas(10); r3[0] = { id: r3[0].id, escolha: 99 };
    expect(corrigir(r3)).toBeNull();
  });
});
