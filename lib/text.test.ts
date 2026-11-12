import { describe, it, expect } from "vitest";
import { normalizarBusca, contemTexto, nomeArquivoSeguro, variantesCpf, padraoLikeSemAcento } from "./text";

describe("normalizarBusca", () => {
  it("remove acentuação", () => {
    expect(normalizarBusca("São José dos Campos")).toBe("sao jose dos campos");
  });

  it("ignora caixa", () => {
    expect(normalizarBusca("BRAINESTAR")).toBe("brainestar");
  });

  it("null/undefined viram string vazia", () => {
    expect(normalizarBusca(null)).toBe("");
    expect(normalizarBusca(undefined)).toBe("");
  });

  it("remove espaços nas pontas", () => {
    expect(normalizarBusca("  Café Central  ")).toBe("café central".normalize("NFD").replace(/[̀-ͯ]/g, ""));
  });
});

describe("contemTexto", () => {
  it("busca sem acento encontra nome com acento", () => {
    expect(contemTexto("Café Central", "cafe")).toBe(true);
  });

  it("busca com acento encontra nome sem acento", () => {
    expect(contemTexto("Sao Jose Servicos", "josé")).toBe(true);
  });

  it("é case-insensitive", () => {
    expect(contemTexto("BRAINESTAR Serviços de diagnóstico", "brainestar")).toBe(true);
    expect(contemTexto("brainestar servicos", "BRAINESTAR")).toBe(true);
  });

  it("não encontra quando o texto realmente não contém a busca", () => {
    expect(contemTexto("Panificadora Kero Mais", "brainestar")).toBe(false);
  });

  it("texto nulo nunca contém nada além de busca vazia", () => {
    expect(contemTexto(null, "algo")).toBe(false);
    expect(contemTexto(null, "")).toBe(true);
  });
});

describe("nomeArquivoSeguro", () => {
  it("o bug real do CPS: travessão e acento viram hífen/letra sem acento", () => {
    expect(nomeArquivoSeguro("CPS — Panificadora Kero Mais Pedregulho")).toBe("cps-panificadora-kero-mais-pedregulho");
    expect(nomeArquivoSeguro("CPS — Irmandade da Santa Casa de Misericórdia de Lorena"))
      .toBe("cps-irmandade-da-santa-casa-de-misericordia-de-lorena");
  });

  it("título já ASCII (ex: documentos de contrato) fica praticamente igual, só minúsculo/hífen", () => {
    expect(nomeArquivoSeguro("Termo de Compromisso de Estagio")).toBe("termo-de-compromisso-de-estagio");
  });

  it("nunca sobra hífen nas pontas", () => {
    expect(nomeArquivoSeguro("  --CPS--  ")).toBe("cps");
  });

  it("string vazia ou só símbolos cai no nome padrão", () => {
    expect(nomeArquivoSeguro("")).toBe("documento");
    expect(nomeArquivoSeguro("—///—")).toBe("documento");
  });

  it("limita o tamanho pra não estourar limites de filename", () => {
    const longo = "A".repeat(300);
    expect(nomeArquivoSeguro(longo).length).toBeLessThanOrEqual(100);
  });
});

describe("variantesCpf", () => {
  it("CPF formatado digitado casa também com a forma só-dígitos gravada no banco", () => {
    const v = variantesCpf("135.253.756-70");
    expect(v).toContain("13525375670");
    expect(v).toContain("135.253.756-70");
  });
  it("CPF só dígitos também gera a forma formatada", () => {
    expect(variantesCpf("13525375670")).toContain("135.253.756-70");
  });
  it("trecho de CPF (3+ dígitos) busca pelos dígitos", () => {
    expect(variantesCpf("135.253")).toContain("135253");
  });
  it("texto que não parece CPF não gera variante", () => {
    expect(variantesCpf("ana julia")).toEqual([]);
    expect(variantesCpf("12")).toEqual([]);
  });
});

describe("padraoLikeSemAcento", () => {
  it("tira acento, caixa e colapsa espaços", () => {
    expect(padraoLikeSemAcento("  Ana   JÚLIA ")).toBe("%ana julia%");
  });
  it("escapa curingas do LIKE", () => {
    expect(padraoLikeSemAcento("100%_x")).toBe("%100\\%\\_x%");
  });
});

