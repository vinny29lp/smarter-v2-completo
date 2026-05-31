import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { nome, email, senha, curso, vagaId, franchiseId } = await req.json();
  if (!nome||!email||!curso||!senha) return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "E-mail já cadastrado. Use 'Já tenho cadastro'." }, { status: 409 });

  const hash = await bcrypt.hash(senha, 10);
  const fid = franchiseId || (await prisma.franchise.findFirst({ where: { status: "ATIVO" } }))?.id;

  const user = await prisma.user.create({
    data: { name: nome, email, password: hash, role: "ESTUDANTE", franchiseId: fid },
  });
  const student = await prisma.student.create({
    data: { userId: user.id, name: nome, email, curso, status: "DISPONIVEL", franchiseId: fid },
  });

  const vacancy = await prisma.vacancy.findUnique({ where: { id: vagaId } });
  const matching = student.discResult && vacancy?.discDesejado
    ? (student.discResult === vacancy.discDesejado ? 95 : 65) : 60;

  await prisma.application.create({ data: { studentId: student.id, vacancyId: vagaId, matching } });
  return NextResponse.json({ ok: true });
}
