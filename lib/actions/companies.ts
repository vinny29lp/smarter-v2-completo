"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCompanies(franchiseId?: string) {
  return prisma.company.findMany({
    where: franchiseId ? { franchiseId } : {},
    include: {
      franchise: { select: { name: true } },
      _count: { select: { contracts: true, vacancies: true } },
    },
    orderBy: { createdAt: "desc" },
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
