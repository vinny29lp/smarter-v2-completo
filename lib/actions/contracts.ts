"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Calcula a próxima data de vencimento dado o dia do mês */
function calcVencimentoAt(dia: number): Date {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  // Se o dia já passou neste mês, usa o próximo mês
  if (d < hoje) d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Cria (ou atualiza) o lançamento financeiro vinculado a um contrato.
 * Chamada na criação do contrato e como fallback na ativação.
 *
 * @param contractId   ID do contrato
 * @param valorEmpresa Valor que a empresa paga à unidade por mês
 * @param vencimento   Dia do mês para vencimento (padrão: 5)
 * @param franchiseId  ID da franquia
 * @param companyId    ID da empresa
 * @param companyName  Nome da empresa (para a descrição)
 * @param numero       Número do contrato (para a descrição)
 */
export async function criarOuAtualizarLancamentoContrato({
  contractId,
  valorEmpresa,
  vencimento,
  franchiseId,
  companyId,
  companyName,
  numero,
}: {
  contractId: string;
  valorEmpresa: number;
  vencimento?: number | null;
  franchiseId: string;
  companyId: string;
  companyName?: string;
  numero?: string | null;
}) {
  if (!valorEmpresa || valorEmpresa <= 0) return null;

  const diaVenc = vencimento || 5;
  const vencimentoAt = calcVencimentoAt(diaVenc);
  const nome = companyName || "Empresa";
  const descricao = `Taxa de Gestão - ${nome} - Contrato ${numero || "s/n"}`;

  // Verifica se já existe lançamento PENDENTE para este contrato
  const existing = await prisma.financial.findFirst({
    where: { contractId, cancelado: false },
    select: { id: true, status: true },
  });

  if (existing) {
    // Atualiza lançamento existente se ainda está pendente
    if (existing.status === "PENDENTE") {
      return prisma.financial.update({
        where: { id: existing.id },
        data: { valor: valorEmpresa, diaVencimento: diaVenc, vencimentoAt, descricao },
      });
    }
    // Já pago/cancelado — não altera
    return null;
  }

  // Cria novo lançamento
  return prisma.financial.create({
    data: {
      descricao,
      tipo: "entrada",
      valor: valorEmpresa,
      categoria: "Empresa",
      status: "PENDENTE",
      recorrente: true,
      diaVencimento: diaVenc,
      vencimentoAt,
      franchiseId,
      companyId,
      contractId,
    },
  });
}

async function gerarNumeroContrato(franchiseId: string): Promise<string> {
  const ano = new Date().getFullYear();
  const count = await prisma.contract.count({
    where: { franchiseId, createdAt: { gte: new Date(`${ano}-01-01`) } },
  });
  return `${String(count + 1).padStart(3,"0")}/${ano}`;
}

export async function getContracts(
  franchiseId?: string,
  companyId?: string,
  hideInativo?: boolean,
  page: number = 1,
  limit: number = 200,
) {
  const skip = (page - 1) * limit;
  return prisma.contract.findMany({
    where: {
      ...(franchiseId ? { franchiseId } : {}),
      ...(companyId ? { companyId } : {}),
      // FRANQUEADO não vê contratos INATIVO — só FRANQUEADORA pode
      ...(hideInativo ? { status: { not: "INATIVO" as any } } : {}),
    },
    // ⚡ Otimizado: select apenas campos necessários para a listagem (sem include full)
    select: {
      id: true, numero: true, status: true, tipoEstagio: true, bolsa: true,
      valorEmpresa: true, auxTransporte: true,
      dataInicio: true, dataFim: true, createdAt: true,
      student: { select: { id: true, name: true, email: true, curso: true } },
      company: { select: { id: true, name: true, cnpj: true } },
      institution: { select: { id: true, name: true } },
      franchise: { select: { id: true, name: true } },
      documents: { select: { id: true, status: true } }, // necessário para contagem de assinados
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
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

  // Criar contrato e documentos em transaction — se createMany falhar, o contrato é revertido
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

  let contract;
  try {
    contract = await prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: { ...safeData, numero },
      });
      await tx.internshipDocument.createMany({
        data: docTipos.map(d => ({
          contractId: created.id,
          tipo: d.tipo,
          titulo: d.titulo,
          status: "NAO_GERADO",
        })),
      });
      return created;
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

  // Atualizar status do estudante
  await prisma.student.update({
    where: { id: data.studentId },
    data: { status: "EM_ESTAGIO" },
  }).catch(() => {});

  // Gamificação
  await prisma.gamificationPoint.create({
    data: { franchiseId: data.franchiseId, acao: "contrato_criado", pontos: 400 },
  }).catch(() => {});

  // ── Lançamento financeiro automático ────────────────────────────────────
  // Cria a parcela mensal em "A Receber" assim que o contrato é gerado.
  if (safeData.valorEmpresa && safeData.valorEmpresa > 0) {
    await criarOuAtualizarLancamentoContrato({
      contractId: contract.id,
      valorEmpresa: safeData.valorEmpresa,
      vencimento: safeData.vencimento ?? undefined,
      franchiseId: safeData.franchiseId,
      companyId: safeData.companyId,
      companyName: company?.name,
      numero,
    }).catch(() => {}); // fire-and-forget — não cancela o contrato se falhar
  }

  revalidatePath("/dashboard/contratos");
  return contract;
}

export async function updateContract(id: string, data: any) {
  // Allowlist explícita de campos editáveis — evita mass assignment
  const {
    bolsa, valorEmpresa, auxTransporte, beneficios, vencimento,
    dataInicio, dataFim, atividades, localEstagio, cidade, uf,
    chDiaria, chSemanal, diasSemana, horarioInicio, horarioFim, intervalo,
    supervisorNome, supervisorCargo, supervisorEmail, supervisorTel,
    coordNome, coordCargo, coordEmail, coordTel,
    apoliceSeguro, seguradora, tipoEstagio, status, numero,
  } = data;

  const safeUpdate = {
    ...(bolsa !== undefined ? { bolsa } : {}),
    ...(valorEmpresa !== undefined ? { valorEmpresa } : {}),
    ...(auxTransporte !== undefined ? { auxTransporte } : {}),
    ...(beneficios !== undefined ? { beneficios } : {}),
    ...(vencimento !== undefined ? { vencimento } : {}),
    ...(dataInicio !== undefined ? { dataInicio } : {}),
    ...(dataFim !== undefined ? { dataFim } : {}),
    ...(atividades !== undefined ? { atividades } : {}),
    ...(localEstagio !== undefined ? { localEstagio } : {}),
    ...(cidade !== undefined ? { cidade } : {}),
    ...(uf !== undefined ? { uf } : {}),
    ...(chDiaria !== undefined ? { chDiaria } : {}),
    ...(chSemanal !== undefined ? { chSemanal } : {}),
    ...(diasSemana !== undefined ? { diasSemana } : {}),
    ...(horarioInicio !== undefined ? { horarioInicio } : {}),
    ...(horarioFim !== undefined ? { horarioFim } : {}),
    ...(intervalo !== undefined ? { intervalo } : {}),
    ...(supervisorNome !== undefined ? { supervisorNome } : {}),
    ...(supervisorCargo !== undefined ? { supervisorCargo } : {}),
    ...(supervisorEmail !== undefined ? { supervisorEmail } : {}),
    ...(supervisorTel !== undefined ? { supervisorTel } : {}),
    ...(coordNome !== undefined ? { coordNome } : {}),
    ...(coordCargo !== undefined ? { coordCargo } : {}),
    ...(coordEmail !== undefined ? { coordEmail } : {}),
    ...(coordTel !== undefined ? { coordTel } : {}),
    ...(apoliceSeguro !== undefined ? { apoliceSeguro } : {}),
    ...(seguradora !== undefined ? { seguradora } : {}),
    ...(tipoEstagio !== undefined ? { tipoEstagio } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(numero !== undefined ? { numero } : {}),
  };

  const contract = await prisma.contract.update({ where: { id }, data: safeUpdate });
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
