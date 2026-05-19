"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCrmLeads(franchiseId?: string) {
  return prisma.crmLead.findMany({
    where: franchiseId ? { franchiseId } : {},
    include: { company: true, tasks: { where: { done: false } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createLead(data: any) {
  const lead = await prisma.crmLead.create({ data });
  revalidatePath("/dashboard/crm");
  return lead;
}

export async function updateLead(id: string, data: any) {
  const lead = await prisma.crmLead.update({ where: { id }, data });
  revalidatePath("/dashboard/crm");
  return lead;
}

export async function createTask(data: { leadId: string; descricao: string; dueAt?: Date }) {
  return prisma.crmTask.create({ data });
}

export async function followUp(leadId: string, anotacao: string) {
  const lead = await prisma.crmLead.update({
    where: { id: leadId },
    data: { ultimoContato: new Date(), anotacao },
  });
  revalidatePath("/dashboard/crm");
  return lead;
}
