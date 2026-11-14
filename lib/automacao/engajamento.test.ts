import { describe, it, expect } from "vitest";
import { reativacaoDevida, ativacaoPortalDevida, vagaPrecisaShortlist, candidaturaParada, lembreteEntrevistaDevido, etapaValida } from "./engajamento";

const agora = new Date("2026-11-13T12:00:00Z");
const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000);

describe("reativação (#3)", () => {
  it("cadastro novo não recebe", () => expect(reativacaoDevida({ cadastradaEm: dias(10), envios: [], agora })).toBe(false));
  it("primeiro aviso após 30 dias", () => expect(reativacaoDevida({ cadastradaEm: dias(60), envios: [], agora })).toBe(true));
  it("respeita intervalo de 45 dias", () => {
    expect(reativacaoDevida({ cadastradaEm: dias(200), envios: [dias(20)], agora })).toBe(false);
    expect(reativacaoDevida({ cadastradaEm: dias(200), envios: [dias(50)], agora })).toBe(true);
  });
  it("máximo de 3", () => expect(reativacaoDevida({ cadastradaEm: dias(300), envios: [dias(200), dias(150), dias(100)], agora })).toBe(false));
});

describe("portal (#5)", () => {
  it("quem já entrou não recebe", () => expect(ativacaoPortalDevida({ usuarioCriadoEm: dias(30), nuncaEntrou: false, envios: [], agora })).toBe(false));
  it("aguarda 3 dias", () => expect(ativacaoPortalDevida({ usuarioCriadoEm: dias(1), nuncaEntrou: true, envios: [], agora })).toBe(false));
  it("envia e espera 10 dias", () => {
    expect(ativacaoPortalDevida({ usuarioCriadoEm: dias(30), nuncaEntrou: true, envios: [], agora })).toBe(true);
    expect(ativacaoPortalDevida({ usuarioCriadoEm: dias(30), nuncaEntrou: true, envios: [dias(5)], agora })).toBe(false);
    expect(ativacaoPortalDevida({ usuarioCriadoEm: dias(30), nuncaEntrou: true, envios: [dias(11)], agora })).toBe(true);
  });
});

describe("shortlist (#8)", () => {
  it("vaga com candidatos suficientes não precisa", () => expect(vagaPrecisaShortlist({ criadaEm: dias(5), candidatos: 3, ultimaRodada: null, agora })).toBe(false));
  it("vaga nova demais ou velha demais", () => {
    expect(vagaPrecisaShortlist({ criadaEm: dias(1), candidatos: 0, ultimaRodada: null, agora })).toBe(false);
    expect(vagaPrecisaShortlist({ criadaEm: dias(45), candidatos: 0, ultimaRodada: null, agora })).toBe(false);
  });
  it("precisa e respeita intervalo entre rodadas", () => {
    expect(vagaPrecisaShortlist({ criadaEm: dias(5), candidatos: 1, ultimaRodada: null, agora })).toBe(true);
    expect(vagaPrecisaShortlist({ criadaEm: dias(15), candidatos: 1, ultimaRodada: dias(3), agora })).toBe(false);
    expect(vagaPrecisaShortlist({ criadaEm: dias(15), candidatos: 1, ultimaRodada: dias(11), agora })).toBe(true);
  });
});

describe("funil (#10)", () => {
  it("candidatura parada", () => {
    expect(candidaturaParada({ etapa: "inscritos", criadaEm: dias(6), agora })).toBe(true);
    expect(candidaturaParada({ etapa: "triagem", criadaEm: dias(30), agora })).toBe(false);
    expect(candidaturaParada({ etapa: "inscritos", criadaEm: dias(2), agora })).toBe(false);
  });
  it("lembrete de entrevista", () => {
    expect(lembreteEntrevistaDevido(new Date(agora.getTime() + 24 * 3_600_000), agora)).toBe(true);
    expect(lembreteEntrevistaDevido(new Date(agora.getTime() + 5 * 3_600_000), agora)).toBe(false);
    expect(lembreteEntrevistaDevido(null, agora)).toBe(false);
  });
  it("etapas válidas", () => { expect(etapaValida("triagem")).toBe(true); expect(etapaValida("x")).toBe(false); });
});
