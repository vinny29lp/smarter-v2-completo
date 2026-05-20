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
  // Gerar número automático se não fornecido
  const numero = data.numero || await gerarNumeroContrato(data.franchiseId);

  const contract = await prisma.contract.create({
    data: { ...data, numero },
  });

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
    { tipo: "as",   titulo: "Avaliacao Semestral" },
    { tipo: "pt",   titulo: "Parecer Tecnico" },
    { tipo: "cps",  titulo: "Contrato de Prestacao de Servicos" },
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
  revalidatePath("/dashboard/contratos");
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
