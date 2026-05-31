import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, senha, vagaId } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "E-mail não encontrado. Faça seu cadastro primeiro." }, { status: 404 });

  const valid = await bcrypt.compare(senha, user.password);
  if (!valid) return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });

  if (user.role !== "ESTUDANTE") return NextResponse.json({ error: "Apenas estudantes podem se candidatar." }, { status: 403 });

  const student = await prisma.student.findUnique({ where: { userId: user.id } });
  if (!student) return NextResponse.json({ error: "Perfil de estudante não encontrado." }, { status: 404 });

  const existing = await prisma.application.findUnique({
    where: { studentId_vacancyId: { studentId: student.id, vacancyId: vagaId } },
  });
  if (existing) return NextResponse.json({ error: "Você já está inscrito nesta vaga." }, { status: 409 });

  const vacancy = await prisma.vacancy.findUnique({ where: { id: vagaId } });
  let matching = 60;
  if (student.discResult && vacancy?.discDesejado) {
    matching = student.discResult === vacancy.discDesejado ? 95 : 65;
  }

  await prisma.application.create({ data: { studentId: student.id, vacancyId: vagaId, matching } });
  return NextResponse.json({ ok: true });
}
