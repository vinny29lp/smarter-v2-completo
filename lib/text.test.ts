import { describe, it, expect } from "vitest";
import { normalizarBusca, contemTexto } from "./text";

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
