import { describe, it, expect } from "vitest";
import { proximoFollowup, mensagemFollowup, MAX_FOLLOWUPS } from "./crmFollowup";

describe("proximoFollowup (#2)", () => {
  it("só dispara depois de estourar o SLA da etapa", () => {
    expect(proximoFollowup({ etapa: "primeiro_contato", diasNaEtapa: 2, enviados: 0, diasDesdeUltimo: null })).toBeNull();
    expect(proximoFollowup({ etapa: "primeiro_contato", diasNaEtapa: 3, enviados: 0, diasDesdeUltimo: null })).toBe(1);
  });
  it("espaça os envios e para no máximo", () => {
    expect(proximoFollowup({ etapa: "proposta", diasNaEtapa: 9, enviados: 1, diasDesdeUltimo: 2 })).toBeNull();
    expect(proximoFollowup({ etapa: "proposta", diasNaEtapa: 9, enviados: 1, diasDesdeUltimo: 4 })).toBe(2);
    expect(proximoFollowup({ etapa: "proposta", diasNaEtapa: 20, enviados: MAX_FOLLOWUPS, diasDesdeUltimo: 30 })).toBeNull();
  });
  it("ignora etapas fora do funil de venda", () => {
    expect(proximoFollowup({ etapa: "novo_lead", diasNaEtapa: 9, enviados: 0, diasDesdeUltimo: null })).toBeNull();
    expect(proximoFollowup({ etapa: "fechado", diasNaEtapa: 99, enviados: 0, diasDesdeUltimo: null })).toBeNull();
    expect(proximoFollowup({ etapa: null, diasNaEtapa: 99, enviados: 0, diasDesdeUltimo: null })).toBeNull();
  });
});

describe("mensagemFollowup", () => {
  it("usa o primeiro nome e o terceiro e-mail é de despedida", () => {
    const m1 = mensagemFollowup("proposta", 1, { empresa: "Acme", contato: "Maria Silva", unidade: "Smarter X" });
    expect(m1.corpo).toContain("Olá, Maria!");
    expect(m1.assunto).toContain("Acme");
    const m3 = mensagemFollowup("proposta", 3, { empresa: "Acme" });
    expect(m3.assunto).toContain("Último contato");
    expect(m3.corpo).toContain("Olá!");
  });
});
