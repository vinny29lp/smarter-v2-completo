"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getFinancials(franchiseId?: string, companyId?: string) {
  return prisma.financial.findMany({
    where: {
      ...(franchiseId ? { franchiseId } : {}),
      ...(companyId ? { companyId } : {}),
    },
    include: { company: true, contract: { include: { student: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFinancial(data: any) {
  const fin = await prisma.financial.create({ data });
  revalidatePath("/dashboard/financeiro");
  return fin;
}

export async function markAsPaid(id: string) {
  const fin = await prisma.financial.update({
    where: { id },
    data: { status: "PAGO", paidAt: new Date() },
  });
  revalidatePath("/dashboard/financeiro");
  return fin;
}

export async function cancelFinancial(id: string) {
  const fin = await prisma.financial.update({
    where: { id },
    data: { cancelado: true, status: "CANCELADO" },
  });
  revalidatePath("/dashboard/financeiro");
  return fin;
}
