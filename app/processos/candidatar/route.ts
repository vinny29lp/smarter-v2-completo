import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { studentId, vacancyId } = await req.json();
  if (!studentId || !vacancyId) return NextResponse.json({ error: "Dados faltando." }, { status: 400 });

  const existing = await prisma.application.findUnique({
    where: { studentId_vacancyId: { studentId, vacancyId } },
  });
  if (existing) return NextResponse.json({ error: "Estudante já inscrito nesta vaga." }, { status: 409 });

  const [student, vacancy] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.vacancy.findUnique({ where: { id: vacancyId } }),
  ]);

  let matching = 60;
  if (student?.discResult && vacancy?.discDesejado) {
    matching = student.discResult === vacancy.discDesejado ? 95 : 65;
  } else if (student?.curso && vacancy?.area) matching = 70;

  const application = await prisma.application.create({
    data: { studentId, vacancyId, matching },
  });
  return NextResponse.json({ application });
}
