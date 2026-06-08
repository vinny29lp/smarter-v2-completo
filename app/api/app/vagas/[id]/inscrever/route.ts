import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ESTUDANTE")
    return NextResponse.json({ error: "Apenas estudantes podem se inscrever." }, { status: 403 });

  const studentId = session.user.studentId;
  if (!studentId)
    return NextResponse.json({ error: "Perfil de estudante não encontrado." }, { status: 404 });

  const vacancyId = params.id;

  // Verifica se a vaga existe e está aberta
  const vaga = await prisma.vacancy.findUnique({
    where: { id: vacancyId },
    select: { id: true, status: true, discDesejado: true },
  });
  if (!vaga) return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  if (vaga.status !== "ABERTA")
    return NextResponse.json({ error: "Esta vaga não está aceitando inscrições." }, { status: 409 });

  // Verifica duplicidade
  const existing = await prisma.application.findUnique({
    where: { studentId_vacancyId: { studentId, vacancyId } },
  });
  if (existing) return NextResponse.json({ error: "Você já está inscrito nesta vaga." }, { status: 409 });

  // Calcula matching pelo DISC
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { discResult: true },
  });
  const matching =
    student?.discResult && vaga.discDesejado
      ? student.discResult === vaga.discDesejado ? 95 : 65
      : 60;

  await prisma.application.create({ data: { studentId, vacancyId, matching } });
  return NextResponse.json({ ok: true });
}
