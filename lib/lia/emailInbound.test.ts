import { describe, it, expect } from "vitest";
import { limparTextoResposta, detectarOptOut, deveEscalar, ehAutoResposta, podeResponderAutomaticamente, assuntoResposta, emailDe, lerDecisaoIA } from "./emailInbound";

describe("emailInbound", () => {
  it("remove citação e assinatura", () => {
    expect(limparTextoResposta("Quero saber o valor\n\nEm sex, 13 nov 2026, Lia <x@y> escreveu:\n> texto antigo")).toBe("Quero saber o valor");
    expect(limparTextoResposta("Ok, obrigado!\n> citado")).toBe("Ok, obrigado!");
  });
  it("detecta descadastro", () => {
    for (const t of ["pare de me enviar", "Não quero mais receber", "favor descadastrar", "unsubscribe", "me tirem da lista"]) expect(detectarOptOut(t)).toBe(true);
    expect(detectarOptOut("Quero saber mais sobre as vagas")).toBe(false);
  });
  it("escala assuntos sensíveis", () => {
    for (const t of ["vou acionar meu advogado", "cancelar o contrato", "quero reembolso", "cobrança indevida no boleto"]) expect(deveEscalar(t)).toBe(true);
    expect(deveEscalar("Como solicito uma vaga?")).toBe(false);
  });
  it("não responde auto-respostas nem no-reply", () => {
    expect(ehAutoResposta({ de: "noreply@x.com" })).toBe(true);
    expect(ehAutoResposta({ de: "a@x.com", assunto: "Resposta automática: férias" })).toBe(true);
    expect(ehAutoResposta({ de: "a@x.com", assunto: "Re: vagas", headers: { "Auto-Submitted": "auto-replied" } })).toBe(true);
    expect(ehAutoResposta({ de: "maria@x.com", assunto: "Re: vagas" })).toBe(false);
  });
  it("limite semanal", () => { expect(podeResponderAutomaticamente(2)).toBe(true); expect(podeResponderAutomaticamente(3)).toBe(false); });
  it("assunto e e-mail", () => {
    expect(assuntoResposta("Vagas")).toBe("Re: Vagas"); expect(assuntoResposta("RE: Vagas")).toBe("RE: Vagas");
    expect(emailDe("Maria <Maria@X.com>")).toBe("maria@x.com");
  });
  it("lê decisão da IA com ou sem cerca de código", () => {
    expect(lerDecisaoIA('{"acao":"responder","resposta":"Oi","topicos":["vagas"]}')?.acao).toBe("responder");
    expect(lerDecisaoIA('```json\n{"acao":"encaminhar","resposta":"","topicos":[]}\n```')?.acao).toBe("encaminhar");
    expect(lerDecisaoIA("texto solto")).toBeNull();
    expect(lerDecisaoIA('{"acao":"x"}')).toBeNull();
  });
});
