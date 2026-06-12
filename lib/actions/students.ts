"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 50;

export async function getStudents(params?: {
  page?: number;
  q?: string;
  status?: string;
  cidade?: string;
  disc?: string;
  curso?: string;
}) {
  const page = Math.max(1, params?.page || 1);
  const skip = (page - 1) * PAGE_SIZE;

  // Filtros direto no banco — suporta qualquer volume de estudantes
  const where: any = {};

  if (params?.q) {
    where.OR = [
      { name:  { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { cpf:   { contains: params.q } },
    ];
  }
  if (params?.status)  where.status     = params.status;
  if (params?.cidade)  where.cidade     = { contains: params.cidade, mode: "insensitive" };
  if (params?.disc)    where.discResult = params.disc;
  if (params?.curso)   where.curso      = { contains: params.curso,  mode: "insensitive" };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
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
      skip,
      take: PAGE_SIZE,
    }),
    prisma.student.count({ where }),
  ]);

  return {
    students,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
    pageSize: PAGE_SIZE,
  };
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
