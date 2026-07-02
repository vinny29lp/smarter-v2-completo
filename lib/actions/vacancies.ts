"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type VacancyInput = {
  titulo: string;
  funcao?: string;
  area?: string;
  descricao?: string;
  requisitos?: string;
  beneficios?: string;
  modalidade: string;
  bolsa: number;
  auxTransporte?: number;
  cargaHoraria: number;
  chDiaria: number;
  horario?: string;
  diasSemana?: string;
  cidade?: string;
  uf?: string;
  discDesejado?: string;
  nivel?: string;
  cursoRequerido?: string;
  companyId: string;
  franchiseId: string;
};

// CRIT-002: paginação adicionada — evita payload gigante na view da Franqueadora (100+ franqueados)
export async function getVacancies(
  franchiseId?: string,
  companyId?: string,
  page = 1,
  limit = 50,
) {
  const take = Math.min(100, Math.max(1, limit));
  const skip = (Math.max(1, page) - 1) * take;
  // "FRANQUEADORA" é o sentinel do admin — sem filtro por franquia (retorna toda a rede)
  const isFranqueadora = franchiseId === "FRANQUEADORA";
  const where = {
    ...(franchiseId && !isFranqueadora ? { franchiseId } : {}),
    ...(companyId   ? { companyId }   : {}),
  };
  const [vagas, total] = await Promise.all([
    prisma.vacancy.findMany({
      where,
      include: {
        // select em vez de include completo — evita objetos de empresa desnecessários
        company: { select: { id: true, name: true, cidade: true, uf: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.vacancy.count({ where }),
  ]);
  return { vagas, total, page, totalPages: Math.ceil(total / take) };
}

export async function getVacancy(id: string) {
  return prisma.vacancy.findUnique({
    where: { id },
    include: {
      company: true,
      franchise: true,
      // ALTO-B: take:150 + select — evita carregar centenas de candidatos com user aninhado
      applications: {
        select: {
          id: true, etapa: true, matching: true, createdAt: true,
          student: {
            select: {
              id: true, name: true, email: true, curso: true,
              discResult: true, status: true, cidade: true, uf: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      },
    },
  });
}

export async function createVacancy(data: VacancyInput) {
  // Gerar slug público único
  const slugBase = data.titulo.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50);
  const publicSlug = slugBase + "-" + Date.now().toString(36);

  const vacancy = await prisma.vacancy.create({ data: { ...data, publicSlug } });

  await prisma.gamificationPoint.create({
    data: { franchiseId: data.franchiseId, acao: "vaga_publicada", pontos: 200 },
  });

  revalidatePath("/dashboard/vagas");
  return vacancy;
}

export async function updateVacancy(id: string, data: Partial<VacancyInput>) {
  const vacancy = await prisma.vacancy.update({ where: { id }, data });
  revalidatePath("/dashboard/vagas");
  return vacancy;
}

export async function toggleVacancyStatus(id: string, status: "ABERTA" | "PAUSADA" | "ENCERRADA") {
  const vacancy = await prisma.vacancy.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/dashboard/vagas");
  return vacancy;
}

export async function applyToVacancy(studentId: string, vacancyId: string) {
  const existing = await prisma.application.findUnique({
    where: { studentId_vacancyId: { studentId, vacancyId } },
  });
  if (existing) throw new Error("Estudante já candidatado a esta vaga.");

  const [student, vacancy] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.vacancy.findUnique({ where: { id: vacancyId } }),
  ]);

  // Simple matching by DISC
  let matching = 60;
  if (student?.discResult && vacancy?.discDesejado && student.discResult === vacancy.discDesejado) {
    matching = 95;
  }

  return prisma.application.create({
    data: { studentId, vacancyId, matching },
  });
}

export async function moveApplication(id: string, etapa: string) {
  return prisma.application.update({ where: { id }, data: { etapa } });
}
