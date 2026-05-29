"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function gerarNumeroContrato(franchiseId: string): Promise<string> {
  const ano = new Date().getFullYear();
  const count = await prisma.contract.count({
    where: { franchiseId, createdAt: { gte: new Date(`${ano}-01-01`) } },
  });
  return `${String(count + 1).padStart(3,"0")}/${ano}`;
}

export async function getContracts(franchiseId?: string, companyId?: string, hideInativo?: boolean) {
  return prisma.contract.findMany({
    where: {
      ...(franchiseId ? { franchiseId } : {}),
      ...(companyId ? { companyId } : {}),
      // FRANQUEADO não vê contratos INATIVO — só FRANQUEADORA pode
      ...(hideInativo ? { status: { not: "INATIVO" as any } } : {}),
    },
    include: {
      student: { include: { user: true } },
      company: true,
      institution: true,
      franchise: true,
      documents: true,
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export async function getContract(id: string) {
  return prisma.contract.findUnique({
    where: { id },
    include: {
      student: { include: { user: true, institution: true } },
      company: true,
      institution: true,
      franchise: true,
      documents: { orderBy: { createdAt: "asc" } },
      evaluations: { orderBy: { createdAt: "desc" } },
      financials: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createContract(data: any) {
  // ── Validações antecipadas com mensagens legíveis ──────────────
  if (!data.studentId)   throw new Error("Selecione o Estudante antes de continuar.");
  if (!data.companyId)   throw new Error("Selecione a Empresa antes de continuar.");
  // Se franchiseId não veio (FRANQUEADORA não tem franchiseId na sessão),
  // deriva da empresa selecionada
  if (!data.franchiseId) {
    if (!data.companyId) throw new Error("Selecione a Empresa antes de continuar.");
    const co = await prisma.company.findUnique({ where: { id: data.companyId }, select: { franchiseId: true } });
    if (!co?.franchiseId) throw new Error("A empresa selecionada não está vinculada a nenhuma franquia. Verifique o cadastro da empresa.");
    data.franchiseId = co.franchiseId;
  }
  if (!data.bolsa || isNaN(Number(data.bolsa)))
    throw new Error("Informe um valor de Bolsa válido.");
  if (!data.dataInicio || isNaN(new Date(data.dataInicio).getTime()))
    throw new Error("Data de Início inválida ou ausente.");
  if (!data.dataFim || isNaN(new Date(data.dataFim).getTime()))
    throw new Error("Data de Término inválida ou ausente.");
  if (new Date(data.dataFim) <= new Date(data.dataInicio))
    throw new Error("A Data de Término deve ser posterior à Data de Início.");

  // Confirmar que estudante e empresa existem
  const [student, company] = await Promise.all([
    prisma.student.findUnique({ where: { id: data.studentId }, select: { id: true, name: true } }),
    prisma.company.findUnique({ where: { id: data.companyId }, select: { id: true, name: true } }),
  ]);
  if (!student) throw new Error(`Estudante não encontrado (id: ${data.studentId}). Recarregue a lista.`);
  if (!company) throw new Error(`Empresa não encontrada (id: ${data.companyId}). Recarregue a lista.`);

  // Sanitizar — remover campos que não existem no schema Contract
  const {
    // Extraímos apenas os campos válidos do schema para evitar erros do Prisma
    studentId, companyId, institutionId, franchiseId,
    bolsa, valorEmpresa, auxTransporte, beneficios, vencimento,
    dataInicio, dataFim, atividades, localEstagio, cidade, uf,
    chDiaria, chSemanal, diasSemana, horarioInicio, horarioFim, intervalo,
    supervisorNome, supervisorCargo, supervisorEmail, supervisorTel,
    coordNome, coordCargo, coordEmail, coordTel,
    apoliceSeguro, seguradora, tipoEstagio,
    numero: _numero,
    ...rest  // descartamos campos extras
  } = data;

  const safeData = {
    studentId, companyId, franchiseId,
    ...(institutionId ? { institutionId } : {}),
    bolsa, vencimento, dataInicio, dataFim,
    ...(valorEmpresa !== null && valorEmpresa !== undefined ? { valorEmpresa } : {}),
    ...(auxTransporte !== null && auxTransporte !== undefined ? { auxTransporte } : {}),
    ...(beneficios ? { beneficios } : {}),
    ...(atividades ? { atividades } : {}),
    ...(localEstagio ? { localEstagio } : {}),
    ...(cidade ? { cidade } : {}),
    ...(uf ? { uf } : {}),
    chDiaria, chSemanal, intervalo,
    ...(diasSemana ? { diasSemana } : {}),
    ...(horarioInicio ? { horarioInicio } : {}),
    ...(horarioFim ? { horarioFim } : {}),
    ...(supervisorNome ? { supervisorNome } : {}),
    ...(supervisorCargo ? { supervisorCargo } : {}),
    ...(supervisorEmail ? { supervisorEmail } : {}),
    ...(supervisorTel ? { supervisorTel } : {}),
    ...(coordNome ? { coordNome } : {}),
    ...(coordCargo ? { coordCargo } : {}),
    ...(coordEmail ? { coordEmail } : {}),
    ...(coordTel ? { coordTel } : {}),
    ...(apoliceSeguro ? { apoliceSeguro } : {}),
    ...(seguradora ? { seguradora } : {}),
    ...(tipoEstagio ? { tipoEstagio } : {}),
  };

  // Gerar número automático se não fornecido
  const numero = _numero || await gerarNumeroContrato(franchiseId);

  let contract;
  try {
    contract = await prisma.contract.create({
      data: { ...safeData, numero },
    });
  } catch (dbErr: any) {
    // Traduzir erros comuns do Prisma para mensagens legíveis
    const raw: string = dbErr?.message || String(dbErr);
    if (raw.includes("Unique constraint")) {
      throw new Error("Já existe um contrato com esses dados. Verifique duplicatas.");
    }
    if (raw.includes("Foreign key constraint")) {
      throw new Error("Referência inválida: verifique se Estudante, Empresa e Instituição ainda existem no sistema.");
    }
    throw new Error(`Erro ao salvar no banco de dados: ${raw.slice(0, 200)}`);
  }

  // Criar 11 documentos automaticamente
  const docTipos = [
    { tipo: "tce",  titulo: "Termo de Compromisso de Estagio" },
    { tipo: "pe",   titulo: "Plano de Estagio" },
    { tipo: "ta",   titulo: "Termo Aditivo" },
    { tipo: "tr",   titulo: "Rescisao ao TCE" },
    { tipo: "rr",   titulo: "Recibo de Rescisao" },
    { tipo: "rec",  titulo: "Termo de Recesso Remunerado" },
    { tipo: "rpb",  titulo: "Recibo de Pagamento de Bolsa" },
    { tipo: "re",   titulo: "Termo de Realizacao de Estagio" },
    { tipo: "pt",   titulo: "Parecer Tecnico" },
    // "as" (Avaliação Semestral) foi movido para formulário online no portal da empresa
    // "cps" (Contrato de Prestação de Serviços) foi movido para o cadastro da empresa
  ];

  await prisma.internshipDocument.createMany({
    data: docTipos.map(d => ({
      contractId: contract.id,
      tipo: d.tipo,
      titulo: d.titulo,
      status: "NAO_GERADO",
    })),
  });

  // Atualizar status do estudante
  await prisma.student.update({
    where: { id: data.studentId },
    data: { status: "EM_ESTAGIO" },
  }).catch(() => {});

  // Gamificação
  await prisma.gamificationPoint.create({
    data: { franchiseId: data.franchiseId, acao: "contrato_criado", pontos: 400 },
  }).catch(() => {});

  revalidatePath("/dashboard/contratos");
  return contract;
}

export async function updateContract(id: string, data: any) {
  const contract = await prisma.contract.update({ where: { id }, data });
  revalidatePath("/dashboard/contratos");
  return contract;
}

export async function updateContractStatus(id: string, status: string) {
  const contract = await prisma.contract.update({
    where: { id },
    data: { status: status as any },
  });

  // Sincronizar status do estudante conforme o novo status do contrato
  if (status === "INATIVO") {
    // Rescisão: estudante volta a ficar disponível
    await prisma.student.update({
      where: { id: contract.studentId },
      data: { status: "DISPONIVEL" },
    }).catch(() => {});
  } else if (status === "FINALIZADO") {
    // Término natural: marca estudante como finalizado
    await prisma.student.update({
      where: { id: contract.studentId },
      data: { status: "FINALIZADO" },
    }).catch(() => {});
  }

  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/estudantes");
  return contract;
}

export async function updateDocument(id: string, data: {
  status?: string; htmlContent?: string; pdfUrl?: string;
  signedUrl?: string; signedAt?: Date; metaData?: any;
}) {
  return prisma.internshipDocument.update({
    where: { id },
    data: { ...data, status: data.status as any },
  });
}
