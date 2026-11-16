import { describe, it, expect } from "vitest";
import {
  semestralDevida, marcoFim, limiteDoisAnosAcumulado, pesquisaDevida, vagaParadaDevida, retornoEmpresaDevido,
  MAX_COBRANCAS_SEMESTRAL,
} from "./cicloRegras";

const D = 86_400_000;
const agora = new Date("2026-11-15T12:00:00Z");
const atras = (n: number) => new Date(agora.getTime() - n * D);

describe("semestralDevida", () => {
  it("não avisa antes de 165 dias", () => {
    expect(semestralDevida({ dataInicio: atras(164), ultimaRespondidaEm: null, enviosDoCiclo: [], agora })).toBeNull();
  });
  it("primeiro aviso a 15 dias de fechar 6 meses", () => {
    const r = semestralDevida({ dataInicio: atras(165), ultimaRespondidaEm: null, enviosDoCiclo: [], agora });
    expect(r).toMatchObject({ acao: "primeira", numero: 1, diasParaFechar: 15 });
  });
  it("conta o ciclo a partir da última avaliação respondida", () => {
    expect(semestralDevida({ dataInicio: atras(400), ultimaRespondidaEm: atras(60), enviosDoCiclo: [], agora })).toBeNull();
    expect(semestralDevida({ dataInicio: atras(400), ultimaRespondidaEm: atras(170), enviosDoCiclo: [], agora })?.acao).toBe("primeira");
  });
  it("cobra a cada 5 dias até preencher", () => {
    const base = { dataInicio: atras(200), ultimaRespondidaEm: null };
    expect(semestralDevida({ ...base, enviosDoCiclo: [atras(3)], agora })).toBeNull();
    expect(semestralDevida({ ...base, enviosDoCiclo: [atras(5)], agora })).toMatchObject({ acao: "cobranca", numero: 2 });
    expect(semestralDevida({ ...base, enviosDoCiclo: [atras(30), atras(10), atras(5)], agora })?.numero).toBe(4);
  });
  it("envios de ciclos anteriores não contam", () => {
    const r = semestralDevida({ dataInicio: atras(400), ultimaRespondidaEm: atras(170), enviosDoCiclo: [atras(190)], agora });
    expect(r?.acao).toBe("primeira");
  });
  it("para no teto de cobranças", () => {
    const envios = Array.from({ length: MAX_COBRANCAS_SEMESTRAL }, (_, i) => atras(10 + i * 5));
    expect(semestralDevida({ dataInicio: atras(300), ultimaRespondidaEm: null, enviosDoCiclo: envios, agora })).toBeNull();
  });
});

describe("marcoFim", () => {
  it("30 e 7 dias", () => {
    expect(marcoFim(45)).toBeNull();
    expect(marcoFim(30)).toBe(30);
    expect(marcoFim(12)).toBe(30);
    expect(marcoFim(7)).toBe(7);
    expect(marcoFim(0)).toBe(7);
    expect(marcoFim(-1)).toBeNull();
  });
});

describe("limiteDoisAnosAcumulado", () => {
  it("soma contratos anteriores na mesma empresa", () => {
    const r = limiteDoisAnosAcumulado(new Date("2024-12-01"), new Date("2026-11-30"));
    expect(r.noLimite).toBe(true);
    expect(limiteDoisAnosAcumulado(new Date("2025-06-01"), new Date("2026-06-01")).noLimite).toBe(false);
  });
});

describe("pesquisaDevida", () => {
  it("só dentro da janela 2–30 dias e uma vez", () => {
    expect(pesquisaDevida({ encerradoEm: atras(1), jaEnviada: false, agora })).toBe(false);
    expect(pesquisaDevida({ encerradoEm: atras(2), jaEnviada: false, agora })).toBe(true);
    expect(pesquisaDevida({ encerradoEm: atras(31), jaEnviada: false, agora })).toBe(false);
    expect(pesquisaDevida({ encerradoEm: atras(5), jaEnviada: true, agora })).toBe(false);
    expect(pesquisaDevida({ encerradoEm: null, jaEnviada: false, agora })).toBe(false);
  });
});

describe("vagaParadaDevida", () => {
  it("30+ dias, a cada 15, máx. 3", () => {
    expect(vagaParadaDevida({ criadaEm: atras(29), envios: [], agora })).toBeNull();
    expect(vagaParadaDevida({ criadaEm: atras(30), envios: [], agora })?.numero).toBe(1);
    expect(vagaParadaDevida({ criadaEm: atras(60), envios: [atras(10)], agora })).toBeNull();
    expect(vagaParadaDevida({ criadaEm: atras(60), envios: [atras(15)], agora })?.numero).toBe(2);
    expect(vagaParadaDevida({ criadaEm: atras(120), envios: [atras(60), atras(40), atras(20)], agora })).toBeNull();
  });
});

describe("retornoEmpresaDevido", () => {
  it("candidato parado 7+ dias, cobra a cada 7, máx. 3", () => {
    expect(retornoEmpresaDevido({ maisAntigaParadaEm: atras(6), envios: [], agora })).toBeNull();
    expect(retornoEmpresaDevido({ maisAntigaParadaEm: atras(7), envios: [], agora })?.numero).toBe(1);
    expect(retornoEmpresaDevido({ maisAntigaParadaEm: atras(20), envios: [atras(3)], agora })).toBeNull();
    expect(retornoEmpresaDevido({ maisAntigaParadaEm: atras(20), envios: [atras(7)], agora })?.numero).toBe(2);
    expect(retornoEmpresaDevido({ maisAntigaParadaEm: atras(40), envios: [atras(30), atras(20), atras(10)], agora })).toBeNull();
    expect(retornoEmpresaDevido({ maisAntigaParadaEm: null, envios: [], agora })).toBeNull();
  });
});
