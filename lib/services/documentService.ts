import { prisma } from "@/lib/prisma";
import type { ContratoData } from "@/lib/documents/types";

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

  // Build 7-day schedule from diasSemana string
  const ALL_DAYS = [
    "Segunda-feira","Terca-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sabado","Domingo"
  ];
  const DISP_DAYS = [
    "Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado","Domingo"
  ];
  const diasStr = (contract.diasSemana || "Segunda a Sexta").toLowerCase();

  // Detect active days from the string
  const dayTerms: Record<string, string> = {
    "Segunda-feira": "segunda", "Terca-feira": "terca",
    "Quarta-feira": "quarta", "Quinta-feira": "quinta",
    "Sexta-feira": "sexta", "Sabado": "sab", "Domingo": "dom",
  };

  // Handle range "X a Y": find start and end day indices and mark all between active
  const rangeMatch = diasStr.match(/(\w+)\s+a\s+(\w+)/);
  let activeDays = new Set<number>();
  if (rangeMatch) {
    const startTerm = rangeMatch[1];
    const endTerm = rangeMatch[2];
    const startIdx = ALL_DAYS.findIndex(d => dayTerms[d] && startTerm.startsWith(dayTerms[d]));
    const endIdx = ALL_DAYS.findIndex(d => dayTerms[d] && endTerm.startsWith(dayTerms[d]));
    if (startIdx !== -1 && endIdx !== -1) {
      for (let i = startIdx; i <= endIdx; i++) activeDays.add(i);
    }
  }
  // Also check individual mentions
  ALL_DAYS.forEach((d, i) => {
    if (dayTerms[d] && diasStr.includes(dayTerms[d])) activeDays.add(i);
  });
  // Fallback: Mon-Fri if nothing detected
  if (activeDays.size === 0) { for (let i = 0; i < 5; i++) activeDays.add(i); }

  const horarios = ALL_DAYS.map((dia, i) => ({
    dia: DISP_DAYS[i],
    inicio: activeDays.has(i) ? (contract.horarioInicio ?? "—") : "—",
    fim: activeDays.has(i) ? (contract.horarioFim ?? "—") : "—",
    ativo: activeDays.has(i),
  }));

  const smarter = {
    razaoSocial: franchise?.razaoSocial || franchise?.name || "Smarter Estagios Agente de Integracao Ltda.",
    cnpj: franchise?.cnpj || "XX.XXX.XXX/0001-XX",
    endereco: franchise?.endereco || "—",
    cidade: franchise?.cidade || "São Paulo",
    estado: franchise?.uf || "SP",
    telefone: franchise?.telefone || "—",
    email: franchise?.email || "contato@smarter.com.br",
    responsavel: franchise?.responsavel || "Diretor Executivo",
  };

  return {
    numero: contract.numero || contract.id.slice(0, 8).toUpperCase(),
    dataAssinatura: new Date(contract.dataInicio).toLocaleDateString("pt-BR"),
    cidadeAssinatura: (contract as any).cidade || company.cidade || "São Paulo",
    tipoEstagio: contract.tipoEstagio ?? "Não Obrigatório",
    estudante: {
      nome: student.name,
      cpf: student.cpf || "—",
      rg: student.rg || "—",
      dataNascimento: student.dataNasc ? new Date(student.dataNasc).toLocaleDateString("pt-BR") : "—",
      telefone: student.telefone || "—",
      celular: student.celular || "—",
      email: student.email,
      endereco: [student.endereco, student.bairro].filter(Boolean).join(" — ") || "—",
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
      endereco: [company.endereco, company.bairro].filter(Boolean).join(" — ") || "—",
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
    smarter,
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
      localEstagio: contract.localEstagio || (company.cidade + "/" + company.uf),
      horarios,
      apoliceSeguro: contract.apoliceSeguro || "A ser informada pelo Agente",
      seguradora: contract.seguradora || "A ser contratada pelo Agente de Integração",
    },
  };
}

export async function saveDocumentHtml(docId: string, html: string, status: string = "GERADO") {
  return prisma.internshipDocument.update({
    where: { id: docId },
    data: { htmlContent: html, status: status as any, updatedAt: new Date() },
  });
}
