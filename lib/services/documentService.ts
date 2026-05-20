import { prisma } from "@/lib/prisma";
import type { ContratoData } from "@/lib/documents/types";

const SMARTER_DEFAULT = {
  razaoSocial: "Smarter Estagios Agente de Integracao Ltda.",
  cnpj: "XX.XXX.XXX/0001-XX",
  endereco: "Rua das Palmeiras, 200",
  cidade: "Sao Paulo",
  estado: "SP",
  telefone: "(11) 99000-0000",
  email: "contato@smarter.com.br",
  responsavel: "Diretor Executivo",
};

export async function buildContratoData(contractId: string): Promise<ContratoData | null> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      student: { include: { user: true, institution: true } },
      company: true,
      institution: true,
      franchise: true,
    },
  });

  if (!contract) return null;

  const { student, company, institution, franchise } = contract;

  const dias = ["Segunda-feira","Terca-feira","Quarta-feira","Quinta-feira","Sexta-feira"];
  const horarios = dias.map(dia => ({
    dia,
    inicio: contract.horarioInicio ?? "—",
    fim: contract.horarioFim ?? "—",
  }));

  return {
    numero: contract.numero || contract.id.slice(0, 8).toUpperCase(),
    dataAssinatura: new Date(contract.dataInicio).toLocaleDateString("pt-BR"),
    cidadeAssinatura: (contract as any).cidade || company.cidade || "Sao Paulo",
    tipoEstagio: contract.tipoEstagio ?? "Não Obrigatório",
    estudante: {
      nome: student.name,
      cpf: student.cpf || "—",
      rg: student.rg || "—",
      dataNascimento: student.dataNasc ? new Date(student.dataNasc).toLocaleDateString("pt-BR") : "—",
      telefone: student.telefone || "—",
      celular: student.celular || "—",
      email: student.email,
      endereco: student.endereco || "—",
      bairro: student.bairro || "—",
      cidade: student.cidade || "—",
      estado: student.uf || "—",
      cep: student.cep || "—",
      curso: student.curso || "—",
      periodo: student.periodo || "—",
    },
    empresa: {
      nomeFan: company.name,
      razaoSocial: company.razaoSocial,
      cnpj: company.cnpj,
      endereco: company.endereco || "—",
      bairro: company.bairro || "—",
      cidade: company.cidade,
      estado: company.uf,
      cep: company.cep || "—",
      telefone: company.telefone || "—",
      email: company.email,
      representante: company.responsavel || "—",
      cargoRepresentante: company.cargoResponsavel || "—",
      supervisor: contract.supervisorNome || "—",
      cargoSupervisor: contract.supervisorCargo || "—",
      emailSupervisor: contract.supervisorEmail || "—",
      telefoneSupervisor: contract.supervisorTel || "—",
    },
    instituicao: {
      nomeFan: institution?.name || student.institution?.name || "—",
      razaoSocial: institution?.razaoSocial || student.institution?.razaoSocial || "—",
      cnpj: institution?.cnpj || student.institution?.cnpj || "—",
      endereco: institution?.endereco || "—",
      bairro: "—",
      cidade: institution?.cidade || "—",
      estado: institution?.uf || "—",
      cep: institution?.cep || "—",
      telefone: institution?.telefone || "—",
      email: institution?.email || "—",
      orientador: contract.coordNome || institution?.coordenador || "—",
      cargoOrientador: contract.coordCargo || institution?.cargoCoord || "—",
    },
    smarter: SMARTER_DEFAULT,
    estagio: {
      dataInicio: new Date(contract.dataInicio).toLocaleDateString("pt-BR"),
      dataFim: new Date(contract.dataFim).toLocaleDateString("pt-BR"),
      valorBolsa: contract.bolsa ?? 0,
      valorBolsaExtenso: "—",
      auxilioTransporte: contract.auxTransporte ?? 0,
      beneficios: contract.beneficios ?? "—",
      chDiaria: contract.chDiaria ?? 0,
      chSemanal: contract.chSemanal ?? 0,
      intervalo: contract.intervalo ?? 0,
      atividades: contract.atividades || "—",
      localEstagio: contract.localEstagio || company.cidade + "/" + company.uf,
      horarios,
      apoliceSeguro: contract.apoliceSeguro || "—",
      seguradora: contract.seguradora || "—",
    },
  };
}

export async function saveDocumentHtml(docId: string, html: string, status: string = "GERADO") {
  return prisma.internshipDocument.update({
    where: { id: docId },
    data: { htmlContent: html, status: status as any, updatedAt: new Date() },
  });
}
