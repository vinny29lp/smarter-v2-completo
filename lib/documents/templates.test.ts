import { describe, it, expect } from "vitest";
import { gerarTCE, gerarTermoRecesso, gerarReciboBolsa, gerarReciboRescisao } from "./templates";
import type { ContratoData } from "./types";

function baseContrato(overrides: Partial<ContratoData["estagio"]> = {}): ContratoData {
  return {
    numero: "001/2026",
    dataAssinatura: "01/01/2026",
    cidadeAssinatura: "São Paulo",
    tipoEstagio: "Obrigatorio",
    estudante: {
      nome: "Liliane de Paula Conrado Soares", cpf: "000.000.000-00", rg: "00.000.000-0",
      dataNascimento: "01/01/2000", telefone: "", celular: "(11) 90000-0000", email: "a@a.com",
      endereco: "Rua A", bairro: "Centro", cidade: "São Paulo", estado: "SP", cep: "00000-000",
      curso: "Enfermagem", periodo: "5",
    },
    empresa: {
      nomeFan: "Protemed", razaoSocial: "Protemed Ltda", cnpj: "00.000.000/0001-00",
      endereco: "Rua B", bairro: "Centro", cidade: "São Paulo", estado: "SP", cep: "00000-000",
      telefone: "", email: "a@protemed.com.br",
      representante: "Fulano", cargoRepresentante: "Diretor",
      supervisor: "Beltrano", cargoSupervisor: "Gerente",
      emailSupervisor: "", telefoneSupervisor: "",
    },
    instituicao: {
      nomeFan: "Trivento", razaoSocial: "Trivento Educação Ltda", cnpj: "00.000.000/0001-00",
      endereco: "Rua C", bairro: "Centro", cidade: "São Paulo", estado: "SP", cep: "00000-000",
      telefone: "", email: "",
      orientador: "", cargoOrientador: "", emailOrientador: "",
      supervisorIES: "", cargoSupervisorIES: "", emailSupervisorIES: "",
    },
    smarter: {
      razaoSocial: "Smarter Ltda", cnpj: "00.000.000/0001-00",
      endereco: "Rua D", cidade: "São Paulo", estado: "SP",
      telefone: "", email: "", responsavel: "",
    },
    estagio: {
      dataInicio: "01/01/2026", dataFim: "01/07/2026",
      remunerado: true,
      valorBolsa: 1500, valorBolsaExtenso: "mil e quinhentos reais",
      auxilioTransporte: 0, beneficios: "—",
      chDiaria: 6, chSemanal: 30,
      intervalo: 0, atividades: "Atividades gerais",
      localEstagio: "São Paulo/SP",
      modalidade: "Presencial",
      horarios: [{ dia: "Segunda-feira", inicio: "08:00", fim: "14:00", ativo: true, chDiaria: 6 }],
      apoliceSeguro: "123", seguradora: "Porto Seguro",
      ...overrides,
    },
  };
}

describe("gerarTCE — cláusula 5 (recesso) e 8 (bolsa) condicionais a remunerado", () => {
  it("estágio remunerado: clausulas mencionam bolsa e recesso remunerado", () => {
    const html = gerarTCE(baseContrato({ remunerado: true, valorBolsa: 1500 }));
    expect(html).toContain("recesso remunerado de 30");
    expect(html).toContain("bolsa-auxílio no valor de");
    expect(html).not.toContain("R$ -1,00");
  });

  it("estágio não remunerado: cláusula 5 não promete recesso remunerado, cláusula 8 não fala em bolsa-auxílio paga", () => {
    const html = gerarTCE(baseContrato({ remunerado: false, valorBolsa: -1 }));
    expect(html).toContain("não remunerado");
    expect(html).not.toContain("recesso remunerado de 30");
    expect(html).not.toContain("A UNIDADE CONCEDENTE remunerará");
    // bug real do Liliane: bolsa=-1 nunca pode aparecer como "R$ -1,00" no documento
    expect(html).not.toContain("R$ -1,00");
    expect(html).not.toContain("menos um reais");
  });

  it("bolsa negativa residual em contrato marcado como remunerado é tratada como zero, nunca impressa negativa", () => {
    const html = gerarTCE(baseContrato({ remunerado: true, valorBolsa: -1 }));
    expect(html).not.toContain("R$ -1,00");
    expect(html).not.toContain("menos um reais");
  });
});

describe("gerarTermoRecesso — condicional a remunerado", () => {
  it("remunerado: menciona recesso remunerado e bolsa-auxílio integral", () => {
    const html = gerarTermoRecesso(baseContrato({ remunerado: true }), 30, "01/06/2026", "30/06/2026", "01/2026 a 12/2026");
    expect(html).toContain("Termo de Recesso Remunerado");
    expect(html).toContain("recesso remunerado");
  });

  it("não remunerado: não promete bolsa-auxílio durante o recesso", () => {
    const html = gerarTermoRecesso(baseContrato({ remunerado: false }), 30, "01/06/2026", "30/06/2026", "01/2026 a 12/2026");
    expect(html).not.toContain("bolsa-auxílio integral durante o período");
    expect(html).toContain("sem direito a bolsa-auxílio");
  });
});

describe("gerarReciboBolsa — valores extras (vale-transporte etc.)", () => {
  it("sem extras: total = valor da bolsa", () => {
    const html = gerarReciboBolsa(baseContrato({ valorBolsa: 1500 }), "Setembro/2026");
    expect(html).toContain("R$ 1.500,00");
  });

  it("com extras: total soma bolsa + extras, e cada extra aparece com sua descrição", () => {
    const html = gerarReciboBolsa(baseContrato({ valorBolsa: 1500 }), "Setembro/2026", [
      { descricao: "Vale-Transporte", valor: 220 },
    ]);
    expect(html).toContain("Vale-Transporte");
    expect(html).toContain("R$ 220,00");
    expect(html).toContain("R$ 1.720,00"); // 1500 + 220
  });

  it("múltiplos extras somam corretamente", () => {
    const html = gerarReciboBolsa(baseContrato({ valorBolsa: 1000 }), "Outubro/2026", [
      { descricao: "Vale-Transporte", valor: 200 },
      { descricao: "Auxílio Alimentação", valor: 150 },
    ]);
    expect(html).toContain("R$ 1.350,00"); // 1000 + 200 + 150
  });
});

describe("gerarReciboRescisao — valores extras somam junto com bolsa/recesso e antes dos descontos", () => {
  it("sem extras nem descontos: total = bolsa proporcional + recesso", () => {
    const html = gerarReciboRescisao(baseContrato({ valorBolsa: 3000 }), 30, 30, [], 0, 0, false);
    // bolsaDia = 100, diasBolsa=30 => bolsaProp=3000; recesso=0
    expect(html).toContain("R$ 3.000,00");
  });

  it("com extra (vale-transporte) e sem desconto: soma no total", () => {
    const html = gerarReciboRescisao(baseContrato({ valorBolsa: 3000 }), 30, 30, [], 0, 0, false, [
      { descricao: "Vale-Transporte", valor: 220 },
    ]);
    expect(html).toContain("Vale-Transporte");
    expect(html).toContain("R$ 3.220,00"); // 3000 + 220
  });

  it("com extra E desconto simultaneamente: total = bolsa + extra - desconto", () => {
    const html = gerarReciboRescisao(
      baseContrato({ valorBolsa: 3000 }), 30, 30,
      [{ descricao: "Adiantamento", valor: 500 }],
      0, 0, false,
      [{ descricao: "Vale-Transporte", valor: 220 }],
    );
    // 3000 + 220 - 500 = 2720
    expect(html).toContain("R$ 2.720,00");
  });
});
