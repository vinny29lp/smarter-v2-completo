import { prisma } from "@/lib/prisma";
import type { ContratoData } from "@/lib/documents/types";

export async function buildContratoData(contractId: string): Promise<ContratoData | null> {
  const [contract, systemConfig] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        student: { include: { user: true, institution: true } },
        company: true,
        institution: true,
        franchise: true,
      },
    }),
    prisma.systemConfig.findUnique({ where: { id: "default" } }).catch(() => null),
  ]);

  if (!contract) return null;

  const { student, company, institution, franchise } = contract;

  // Build 7-day schedule from diasSemana string
  const ALL_DAYS = [
    "Segunda-feira","Terca-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sabado","Domingo"
  ];
  const DISP_DAYS = [
    "Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado","Domingo"
  ];
  const diasStr = (contract.diasSemana || "Segunda a Sexta").trim().toLowerCase();

  // Lookup map for preset ranges (handles accented characters correctly)
  const PRESET_RANGES: Record<string, number[]> = {
    "segunda a sexta":   [0,1,2,3,4],
    "segunda a sábado":  [0,1,2,3,4,5],
    "segunda a sabado":  [0,1,2,3,4,5],
    "segunda a domingo": [0,1,2,3,4,5,6],
    "terça a sexta":     [1,2,3,4],
    "terca a sexta":     [1,2,3,4],
    "terça a sábado":    [1,2,3,4,5],
    "terca a sabado":    [1,2,3,4,5],
    "terça a domingo":   [1,2,3,4,5,6],
    "terca a domingo":   [1,2,3,4,5,6],
    "quarta a sexta":    [2,3,4],
    "quarta a sábado":   [2,3,4,5],
    "quarta a sabado":   [2,3,4,5],
    "quarta a domingo":  [2,3,4,5,6],
    "quinta a sexta":    [3,4],
    "quinta a sábado":   [3,4,5],
    "quinta a sabado":   [3,4,5],
    "quinta a domingo":  [3,4,5,6],
    "sexta a sábado":    [4,5],
    "sexta a sabado":    [4,5],
    "sexta a domingo":   [4,5,6],
    "sábado a domingo":  [5,6],
    "sabado a domingo":  [5,6],
    // Ranges that wrap around the week
    "quinta a segunda":  [3,4,5,6,0],
    "sexta a segunda":   [4,5,6,0],
    "sexta a terça":     [4,5,6,0,1],
    "sexta a terca":     [4,5,6,0,1],
    "sábado a segunda":  [5,6,0],
    "sabado a segunda":  [5,6,0],
    "sábado a terça":    [5,6,0,1],
    "sabado a terca":    [5,6,0,1],
    "sábado a quarta":   [5,6,0,1,2],
    "sabado a quarta":   [5,6,0,1,2],
    "domingo a segunda": [6,0],
    "domingo a terça":   [6,0,1],
    "domingo a terca":   [6,0,1],
    "domingo a quarta":  [6,0,1,2],
    "domingo a quinta":  [6,0,1,2,3],
    "domingo a sexta":   [6,0,1,2,3,4],
  };

  // Individual day detection (fallback for custom selections)
  const DAY_KEYWORDS: [string, number][] = [
    ["segunda", 0], ["terça", 1], ["terca", 1],
    ["quarta", 2], ["quinta", 3], ["sexta", 4],
    ["sábado", 5], ["sabado", 5], ["domingo", 6],
  ];

  let activeDays = new Set<number>();

  // Try preset lookup first (most accurate)
  if (PRESET_RANGES[diasStr] !== undefined) {
    PRESET_RANGES[diasStr].forEach(i => activeDays.add(i));
  } else {
    // Fallback: check for individual day keywords
    DAY_KEYWORDS.forEach(([keyword, idx]) => {
      if (diasStr.includes(keyword)) activeDays.add(idx);
    });
  }

  // Final fallback: Mon-Fri if nothing detected
  if (activeDays.size === 0) { for (let i = 0; i < 5; i++) activeDays.add(i); }

  const horarios = ALL_DAYS.map((dia, i) => ({
    dia: DISP_DAYS[i],
    inicio: activeDays.has(i) ? (contract.horarioInicio ?? "—") : "—",
    fim: activeDays.has(i) ? (contract.horarioFim ?? "—") : "—",
    ativo: activeDays.has(i),
  }));

  // Use SystemConfig (admin settings) as primary source for Smarter company data
  const smarter = {
    razaoSocial: systemConfig?.razaoSocial || franchise?.razaoSocial || franchise?.name || "Smarter Estágios Agente de Integração Ltda.",
    cnpj: systemConfig?.cnpj || franchise?.cnpj || "—",
    endereco: systemConfig?.endereco || franchise?.endereco || "—",
    cidade: systemConfig?.cidade || franchise?.cidade || "—",
    estado: systemConfig?.uf || franchise?.uf || "SP",
    telefone: systemConfig?.telefone || franchise?.telefone || "—",
    email: systemConfig?.email || franchise?.email || "—",
    responsavel: systemConfig?.responsavel || franchise?.responsavel || "—",
    logoDocUrl: systemConfig?.logoDocUrl || undefined,
    watermarkText: systemConfig?.watermarkText || "SMARTER",
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
      ...((student as any).menorDeIdade && (student as any).nomeResponsavel
        ? { responsavel: { nome: (student as any).nomeResponsavel } }
        : {}),
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
