import { describe, it, expect } from "vitest";
import { paragrafosContrato, faltandoParaContrato, localEData } from "./contratoTemplate";
import { gerarContratoPdf } from "./contratoPdf";

const cadastro = { nome: "Ana Souza", cpf: "52998224725", email: "a@x.com", telefone: "21999990000", nomeUnidade: "Smarter Niterói", cidade: "Niterói", uf: "RJ", regioes: "Niterói", endereco: "Rua A, 10", cep: "24000000" };
const d = { cadastro, regiao: "Niterói - RJ", valor: 4500, formaPagamento: "PIX em 3x", dataContrato: new Date("2026-12-01T15:00:00Z") };
const texto = paragrafosContrato(d).map(p => p.trechos.map(t => t.t).join("")).join("\n");

describe("contrato de franquia", () => {
  it("preenche campos variáveis e não deixa placeholder", () => {
    expect(texto).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(texto).toContain("Ana Souza"); expect(texto).toContain("529.982.247-25");
    expect(texto).toContain("R$ 4.500,00 (quatro mil e quinhentos reais)"); expect(texto).toContain("PIX em 3x");
    expect(texto).toContain("Região de Niterói - RJ");
    expect(localEData(d.dataContrato)).toBe("Rio de Janeiro, 1 de Dezembro de 2026.");
  });
  it("campos variáveis saem em negrito", () => {
    const p = paragrafosContrato(d).find(x => x.trechos.some(t => t.t === "Ana Souza"))!;
    expect(p.trechos.find(t => t.t === "Ana Souza")!.b).toBe(true);
  });
  it("mantém taxas fixas e foro; nada do contrato modelo", () => {
    expect(texto).toContain("R$ 17.000,00"); expect(texto).toContain("R$ 13,00"); expect(texto).toContain("foro da cidade do Rio de Janeiro");
    expect(texto).not.toContain("Santa Isabel"); expect(texto).not.toContain("Ana Paula"); expect(texto).not.toContain("409.417.618");
  });
  it("exige valor e forma de pagamento", () => {
    expect(faltandoParaContrato({ cadastro })).toEqual(["valor negociado", "forma de pagamento"]);
    expect(faltandoParaContrato(d)).toEqual([]);
  });
  it("gera um PDF válido", async () => {
    const buf = await gerarContratoPdf(d);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(20_000);
  });
});
