import { describe, it, expect } from "vitest";
import { calcularMatching, rankear, norm } from "./matching";

const vaga = { cursoRequerido: "Direito", cidade: "Rio de Janeiro", uf: "RJ", discDesejado: "D" };

describe("matching", () => {
  it("normaliza acentos", () => expect(norm("  São PAULO ")).toBe("sao paulo"));
  it("perfeito pontua alto", () => {
    const r = calcularMatching({ curso: "Direito", cidade: "Rio de Janeiro", uf: "RJ", discResult: "D", semestre: "5º", celular: "1", curriculo: {}, habilidades: ["x"] }, vaga);
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.motivos).toContain("Mesma cidade");
  });
  it("curso diferente e outra cidade pontua baixo", () => {
    const r = calcularMatching({ curso: "Engenharia Civil", cidade: "Manaus", uf: "AM" }, vaga);
    expect(r.score).toBeLessThan(25);
  });
  it("curso relacionado conta parcialmente", () => {
    const a = calcularMatching({ curso: "Direito Empresarial" }, vaga).score;
    const b = calcularMatching({ curso: "Medicina" }, vaga).score;
    expect(a).toBeGreaterThan(b);
  });
  it("vaga sem curso aceita qualquer curso", () => {
    expect(calcularMatching({ curso: "Medicina" }, { cidade: "X" }).score).toBeGreaterThanOrEqual(20);
  });
  it("rankeia e filtra pelo mínimo", () => {
    const lista = [{ curso: "Medicina" }, { curso: "Direito", cidade: "Rio de Janeiro" }];
    const r = rankear(lista, vaga, 30);
    expect(r[0].estudante.curso).toBe("Direito");
    expect(r.every(x => x.score >= 30)).toBe(true);
  });
  it("score sempre entre 0 e 100", () => {
    const r = calcularMatching({}, {});
    expect(r.score).toBeGreaterThanOrEqual(0); expect(r.score).toBeLessThanOrEqual(100);
  });
});
