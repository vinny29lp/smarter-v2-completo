import { describe, it, expect } from "vitest";
import { normalizarRegioes, regiaoComoTexto, regiaoDoDia, statusPassos, PASSOS_MANUAIS } from "./regras";

describe("regiões", () => {
  it("normaliza, remove vazias e duplicadas", () => {
    const r = normalizarRegioes([{ cidade: " Niterói ", uf: "rj" }, { cidade: "niteroi" }, { cidade: "" }, { cidade: "Niterói", bairro: "Icaraí" }, null]);
    expect(r).toEqual([{ cidade: "Niterói", uf: "RJ" }, { cidade: "Niterói", bairro: "Icaraí" }]);
    expect(normalizarRegioes("x")).toEqual([]);
  });
  it("texto para o Maps", () => {
    expect(regiaoComoTexto({ cidade: "Niterói", bairro: "Icaraí" }, "RJ")).toBe("Icaraí, Niterói - RJ");
    expect(regiaoComoTexto({ cidade: "Cuiabá", uf: "MT" })).toBe("Cuiabá - MT");
  });
  it("rotaciona por dia", () => {
    const rs = [{ cidade: "A" }, { cidade: "B" }];
    const a = regiaoDoDia(rs, new Date("2026-11-16T12:00:00Z"));
    const b = regiaoDoDia(rs, new Date("2026-11-17T12:00:00Z"));
    expect(a).not.toEqual(b);
    expect(regiaoDoDia([], new Date())).toBeNull();
  });
});

describe("statusPassos", () => {
  const base = { franchise: { endereco: "Rua A, 10", cep: "24000-000", cidade: "Niterói", uf: "RJ", whatsapp: "21999990000" }, regioes: [{ cidade: "Niterói" }], alizoMapeada: false };
  it("só conclui com todos os obrigatórios", () => {
    expect(statusPassos({ ...base, passosManuais: {} }).concluido).toBe(false);
    const todos = Object.fromEntries([...PASSOS_MANUAIS].map(id => [id, true]));
    expect(statusPassos({ ...base, passosManuais: todos }).concluido).toBe(true);
  });
  it("sem região ou sem dados não conclui", () => {
    const todos = Object.fromEntries([...PASSOS_MANUAIS].map(id => [id, true]));
    expect(statusPassos({ ...base, regioes: [], passosManuais: todos }).concluido).toBe(false);
    expect(statusPassos({ ...base, franchise: { ...base.franchise, endereco: "" }, passosManuais: todos }).concluido).toBe(false);
  });
  it("Alizo não bloqueia", () => {
    const todos = Object.fromEntries([...PASSOS_MANUAIS].map(id => [id, true]));
    const s = statusPassos({ ...base, alizoMapeada: false, passosManuais: todos });
    expect(s.concluido).toBe(true);
    expect(s.passos.find(p => p.id === "prospeccao")?.feito).toBe(false);
  });
});
