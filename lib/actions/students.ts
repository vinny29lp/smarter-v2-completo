"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// FRANQUEADO vê apenas estudantes da sua unidade; FRANQUEADORA vê todos
// ⚡ Otimizado: select apenas campos necessários para listagem (sem user completo, sem franchise completo)
export async function getStudents(franchiseId?: string) {
  return prisma.student.findMany({
    where: franchiseId ? { franchiseId } : {},
    select: {
      id: true, name: true, email: true, cpf: true,
      curso: true, cidade: true, uf: true,
      status: true, discResult: true, createdAt: true,
      institution: { select: { id: true, name: true } },
      franchise:   { select: { id: true, name: true } },
      contracts: {
        select: { id: true, status: true, company: { select: { id: true, name: true } } },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getStudent(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      institution: true,
      franchise: true,
      contracts: {
        include: { company: true, institution: true, documents: true },
        orderBy: { createdAt: "desc" },
      },
      applications: { include: { vacancy: { include: { company: true } } } },
      discTests: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function createStudent(data: any) {
  const student = await prisma.student.create({ data });
  revalidatePath("/dashboard/estudantes");
  return student;
}

export async function updateStudent(id: string, data: any) {
  const student = await prisma.student.update({ where: { id }, data });
  revalidatePath("/dashboard/estudantes");
  return student;
}

export async function saveDiscResult(studentId: string, resultado: string, grafico: any, respostas: any) {
  await prisma.discTest.create({
    data: { studentId, resultado, grafico, respostas },
  });
  await prisma.student.update({
    where: { id: studentId },
    data: { discResult: resultado, discData: grafico },
  });
  revalidatePath("/dashboard/estudantes");
}
