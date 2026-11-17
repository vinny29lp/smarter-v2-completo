import { describe, it, expect } from "vitest";
import { decidirProspeccao, estadoPausa, detalhePausa, pendentesDoDetalhe, textoLembreteSales } from "./limiteProspeccao";

describe("decidirProspeccao", () => {
  it("libera abaixo de 60", () => expect(decidirProspeccao(59, null)).toEqual({ acao: "liberada" }));
  it("pausa ao chegar em 60", () => expect(decidirProspeccao(60, null)).toEqual({ acao: "pausar", pendentes: 60 }));
  it("continua bloqueada até tratar 40 desde a pausa", () => {
    const p = { pendentesNaPausa: 60 };
    expect(decidirProspeccao(60, p)).toMatchObject({ acao: "bloqueada", faltamTratar: 40 });
    expect(decidirProspeccao(21, p)).toMatchObject({ acao: "bloqueada", faltamTratar: 1 });
  });
  it("retoma quando 40 foram tratados (60 → 20)", () => {
    expect(decidirProspeccao(20, { pendentesNaPausa: 60 })).toEqual({ acao: "retomar", pendentes: 20 });
    expect(decidirProspeccao(0, { pendentesNaPausa: 60 }).acao).toBe("retomar");
  });
  it("respeita a base real da pausa (ex.: pausou com 63)", () => {
    expect(decidirProspeccao(24, { pendentesNaPausa: 63 }).acao).toBe("bloqueada");
    expect(decidirProspeccao(23, { pendentesNaPausa: 63 }).acao).toBe("retomar");
  });
});

describe("estado da pausa", () => {
  it("só a pausa mais recente vale", () => {
    expect(estadoPausa({ tipo: "ALIZO_PROSPECCAO_PAUSA", detalhe: detalhePausa(62) })).toEqual({ pendentesNaPausa: 62 });
    expect(estadoPausa({ tipo: "ALIZO_PROSPECCAO_RETOMADA", detalhe: "pendentes=10" })).toBeNull();
    expect(estadoPausa(null)).toBeNull();
  });
  it("detalhe inválido assume o limite", () => expect(pendentesDoDetalhe("xyz")).toBe(60));
});

describe("texto do lembrete", () => {
  it("avisa da pausa quando pausada", () => {
    expect(textoLembreteSales(61, true).mensagem).toMatch(/pausada/);
    expect(textoLembreteSales(5, false).mensagem).not.toMatch(/pausada/);
  });
});
