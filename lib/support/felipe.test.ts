import { describe, it, expect } from "vitest";
import { classificarRisco, podePropor, proximoStatus } from "./felipe";

describe("classificarRisco", () => {
  it("texto/rótulo de tela é BAIXO", () =>
    expect(classificarRisco({ category: "bug", title: "Erro de digitação no botão", description: "O texto do rótulo está errado", path: "/dashboard/mes" })).toBe("BAIXO"));
  it("financeiro, acesso e integrações são sempre ALTO", () => {
    expect(classificarRisco({ category: "billing", title: "x", description: "y" })).toBe("ALTO");
    expect(classificarRisco({ category: "bug", title: "Cobrança duplicada", description: "boleto" })).toBe("ALTO");
    expect(classificarRisco({ category: "bug", title: "Não consigo entrar", description: "senha", path: "/login" })).toBe("ALTO");
    expect(classificarRisco({ category: "bug", title: "WhatsApp", description: "Alizo" })).toBe("ALTO");
  });
  it("bug comum sem sinal claro é MEDIO", () =>
    expect(classificarRisco({ category: "bug", title: "Lista não filtra", description: "filtro por cidade" })).toBe("MEDIO"));
});

describe("proposta e transições", () => {
  it("ALTO nunca recebe proposta nem aprovação", () => {
    expect(podePropor("ALTO")).toBe(false);
    expect(proximoStatus("AGUARDANDO_APROVACAO", "APROVAR", "ALTO")).toBeNull();
  });
  it("aprova só o que aguarda aprovação", () => {
    expect(proximoStatus("AGUARDANDO_APROVACAO", "APROVAR", "BAIXO")).toBe("APROVADO");
    expect(proximoStatus("NOVO", "APROVAR", "BAIXO")).toBeNull();
  });
  it("reabrir só de rejeitado/resolvido", () => {
    expect(proximoStatus("RESOLVIDO", "REABRIR")).toBe("NOVO");
    expect(proximoStatus("APROVADO", "REABRIR")).toBeNull();
  });
});
