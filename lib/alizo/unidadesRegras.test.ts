import { describe, it, expect } from "vitest";
import { parseEndereco, payloadUnidade, franquiaDeveOperar, classificarErro, statusAposErro, erroSeguro, restanteProspeccaoHoje, capturadasDoDetalhe, LIMITE_PROSPECCAO_DIA } from "./unidadesRegras";

const f = { id: "f1", name: "Smarter X", responsavel: "Ana", email: "a@x.com", telefone: "1239", whatsapp: null, endereco: "Rua A, 12, sala 3 - Centro", cep: "12.345-678", cidade: "Lorena", uf: "SP" };

describe("unidadesRegras", () => {
  it("monta o payload com external_id permanente e endereço", () => {
    const p = payloadUnidade(f);
    expect(p.external_id).toBe("f1");
    expect(p.address).toMatchObject({ street: "Rua A", number: "12", complement: "sala 3", district: "Centro", city: "Lorena", state: "SP", postal_code: "12345678", country: "BR" });
    expect(p.contact_phone).toBe("1239");
    expect(payloadUnidade(f).external_id).toBe(payloadUnidade(f).external_id);
  });
  it("endereço vazio não inventa dados", () => {
    expect(parseEndereco(null)).toEqual({ street: "", number: "", complement: "", district: "" });
  });
  it("situação da franquia", () => {
    expect(franquiaDeveOperar({ status: "ATIVO", acessoBloqueado: false })).toBe(true);
    expect(franquiaDeveOperar({ status: "ATIVO", acessoBloqueado: true })).toBe(false);
    expect(franquiaDeveOperar({ status: "INATIVO" })).toBe(false);
  });
  it("classifica erros e define o status local", () => {
    expect(classificarErro(503)).toBe("temporario");
    expect(classificarErro(0)).toBe("temporario");
    expect(classificarErro(401)).toBe("autenticacao");
    expect(statusAposErro("temporario")).toBe("pending");
    expect(statusAposErro("autenticacao")).toBe("error");
  });
  it("erroSeguro oculta token e URL", () => {
    const e = erroSeguro(500, "falha Bearer abc123 em https://x.com/a");
    expect(e).not.toContain("abc123"); expect(e).not.toContain("https://");
  });
  it("limite diário de 15", () => {
    expect(restanteProspeccaoHoje(0)).toBe(LIMITE_PROSPECCAO_DIA);
    expect(restanteProspeccaoHoje(15)).toBe(0);
    expect(restanteProspeccaoHoje(20)).toBe(0);
  });
  it("lê capturadas do detalhe", () => {
    expect(capturadasDoDetalhe("Prospecção em Lorena/SP: 12 capturadas")).toBe(12);
    expect(capturadasDoDetalhe("ERRO na prospecção")).toBe(0);
  });
});
