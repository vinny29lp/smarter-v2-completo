import { describe, it, expect } from "vitest";
import { validarCpf, validarCnpj, resolverDocumentoCobranca } from "./documento";

describe("validarCpf / validarCnpj", () => {
  it("CPF real da unidade Montes Claros é válido (com e sem máscara)", () => {
    expect(validarCpf("060.426.996-01")).toBe(true);
    expect(validarCpf("06042699601")).toBe(true);
  });
  it("CPF com dígito errado ou repetido é inválido", () => {
    expect(validarCpf("060.426.996-02")).toBe(false);
    expect(validarCpf("111.111.111-11")).toBe(false);
    expect(validarCpf("123")).toBe(false);
  });
  it("o 'CNPJ' quebrado do cadastro (CPF + 000) NÃO é um CNPJ válido, embora tenha 14 dígitos", () => {
    expect(validarCnpj("06.042.699/6010-00")).toBe(false);
  });
  it("CNPJ válido conhecido passa", () => {
    expect(validarCnpj("11.222.333/0001-81")).toBe(true);
    expect(validarCnpj("11222333000181")).toBe(true);
  });
});

describe("resolverDocumentoCobranca", () => {
  const montesClaros = {
    name: "Unidade Montes Claros/MG",
    razaoSocial: null,
    responsavel: "Sergio Moreno Lopes Ferreira",
    cnpj: "06.042.699/6010-00",
    cpf: "06042699601",
  };

  it("caso real: CNPJ inválido + CPF válido → cobra no CPF, no nome do responsável", () => {
    const r = resolverDocumentoCobranca(montesClaros);
    expect(r).toEqual({ ok: true, documento: "06042699601", tipoDocumento: "CPF", nomeCliente: "Sergio Moreno Lopes Ferreira" });
  });

  it("CNPJ válido continua ganhando e usa razão social (comportamento das demais unidades não muda)", () => {
    const r = resolverDocumentoCobranca({ name: "Unidade X", razaoSocial: "X Franquias LTDA", responsavel: "Fulano", cnpj: "11.222.333/0001-81", cpf: "06042699601" });
    expect(r).toEqual({ ok: true, documento: "11222333000181", tipoDocumento: "CNPJ", nomeCliente: "X Franquias LTDA" });
  });

  it("só CPF válido, sem responsável nem razão social → cai no nome da unidade", () => {
    const r = resolverDocumentoCobranca({ name: "Unidade Y", cpf: "060.426.996-01" });
    expect(r).toMatchObject({ ok: true, tipoDocumento: "CPF", nomeCliente: "Unidade Y" });
  });

  it("sem nenhum documento → erro claro", () => {
    const r = resolverDocumentoCobranca({ name: "Unidade Z" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("não cadastrado");
  });

  it("documentos preenchidos mas inválidos → erro dizendo qual está inválido", () => {
    const r = resolverDocumentoCobranca({ name: "Unidade W", cnpj: "06.042.699/6010-00", cpf: "111.111.111-11" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("inválido");
  });
});
