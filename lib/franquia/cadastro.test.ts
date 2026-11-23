import { describe, it, expect } from "vitest";
import { cpfValido, validarCadastro, regioesDoCadastro } from "./cadastro";

const ok = { nome: "Maria Souza", cpf: "529.982.247-25", email: "Maria@x.com", telefone: "(21) 99999-0000", nomeUnidade: "Smarter Niterói", cidade: "Niterói", uf: "rj", regioes: "Icaraí, Niterói; Centro" };

describe("cadastro de franquia", () => {
  it("valida CPF", () => { expect(cpfValido("529.982.247-25")).toBe(true); expect(cpfValido("111.111.111-11")).toBe(false); expect(cpfValido("123")).toBe(false); });
  it("aceita cadastro válido e normaliza", () => {
    const r = validarCadastro(ok);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.dados.email).toBe("maria@x.com"); expect(r.dados.uf).toBe("RJ"); expect(r.dados.cpf).toBe("52998224725"); }
  });
  it("rejeita campos faltando ou inválidos", () => {
    expect(validarCadastro({ ...ok, cpf: "1" }).ok).toBe(false);
    expect(validarCadastro({ ...ok, email: "x" }).ok).toBe(false);
    expect(validarCadastro({ ...ok, cnpj: "123" }).ok).toBe(false);
    expect(validarCadastro({ ...ok, regioes: "" }).ok).toBe(false);
    expect(validarCadastro(null).ok).toBe(false);
  });
  it("remove < e >", () => { const r = validarCadastro({ ...ok, nomeUnidade: "<b>Smarter</b> X" }); expect(r.ok && r.dados.nomeUnidade).toBe("bSmarter/b X"); });
  it("converte regiões", () => {
    expect(regioesDoCadastro({ regioes: "Icaraí, Niterói; Centro", cidade: "Niterói", uf: "RJ" })).toEqual([{ bairro: "Icaraí", cidade: "Niterói", uf: "RJ" }, { cidade: "Centro", uf: "RJ" }]);
  });
});
