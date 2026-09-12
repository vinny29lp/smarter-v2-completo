"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// take alto o suficiente pra caber todas as empresas visíveis numa única
// chamada — a busca da tela /dashboard/empresas filtra em memória sobre
// este resultado, então um corte baixo aqui derruba empresas mais antigas
// da lista ANTES da busca rodar, fazendo parecer que elas "não existem".
// Achado em 2026-09-12: "BRAINESTAR Serviços de Diagnóstico" (criada em
// 29/06) não aparecia na busca da aba Empresas — ela era a 221ª empresa
// mais recente (de 256 no banco), fora do take:200 anterior — mesma causa
// raiz do bug do dropdown de vaga corrigido em 2026-08-18 (ver
// app/api/app/empresas/route.ts), só que numa rota diferente.
export async function getCompanies(franchiseId?: string) {
  // Empresas migradas (origem=MIGRADO) são visíveis a todas as unidades, além das próprias
  return prisma.company.findMany({
    where: franchiseId ? { OR: [{ franchiseId }, { origem: "MIGRADO" }] } : {},
    include: {
      franchise: { select: { name: true } },
      _count: { select: { contracts: true, vacancies: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
}

export async function getCompany(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      franchise: true,
      contracts: {
        include: {
          student: true,
          documents: {
            where: { status: { in: ["AGUARDANDO_ASSINATURA", "ASSINADO", "ENVIADO_ASSINATURA"] } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      vacancies: {
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: "desc" },
      },
      crmLeads: { orderBy: { updatedAt: "desc" }, take: 10 },
      financials: { orderBy: { createdAt: "desc" }, take: 20 },
      users: { select: { id: true, name: true, email: true, active: true, lastLoginAt: true } },
    },
  });
}

export async function createCompany(data: any) {
  const company = await prisma.company.create({ data });
  await prisma.gamificationPoint.create({
    data: { franchiseId: data.franchiseId, acao: "empresa_cadastrada", pontos: 300 },
  }).catch(() => {});
  revalidatePath("/dashboard/empresas");
  return company;
}

export async function updateCompany(id: string, data: any) {
  const company = await prisma.company.update({ where: { id }, data });
  revalidatePath("/dashboard/empresas");
  return company;
}
