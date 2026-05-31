import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function getStudent(session: any) {
  // Tentativa 1: pelo studentId da session (caminho normal)
  if (session?.user?.studentId) {
    const s = await prisma.student.findUnique({
      where: { id: session.user.studentId },
      include: { institution: true },
    });
    if (s) return s;
  }

  // Tentativa 2: pelo userId do User que tem relação OneToOne com Student
  if (session?.user?.id) {
    const s = await prisma.student.findFirst({
      where: { userId: session.user.id },
      include: { institution: true },
    });
    if (s) return s;
  }

  // Tentativa 3: pelo email do usuário logado
  if (session?.user?.email) {
    const s = await prisma.student.findFirst({
      where: { email: session.user.email },
      include: { institution: true },
    });
    if (s) return s;
  }

  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const student = await getStudent(session);
  if (!student) return NextResponse.json({ student: null });

  return NextResponse.json({ student });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const student = await getStudent(session);
  if (!student) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.student.update({
    where: { id: student.id },
    data: {
      ...(body.name              ? { name: body.name }                                     : {}),
      ...(body.cpf  !== undefined ? { cpf:  body.cpf  || null }                            : {}),
      ...(body.rg   !== undefined ? { rg:   body.rg   || null }                            : {}),
      ...(body.dataNasc          ? { dataNasc: new Date(body.dataNasc) }                   : {}),
      ...(body.celular !== undefined ? { celular: body.celular || null }                   : {}),
      ...(body.telefone !== undefined ? { telefone: body.telefone || null }                : {}),
      ...(body.linkedin !== undefined ? { linkedin: body.linkedin || null }                : {}),
      ...(body.portfolio !== undefined ? { portfolio: body.portfolio || null }             : {}),
      ...(body.endereco !== undefined ? { endereco: body.endereco || null }                : {}),
      ...(body.bairro   !== undefined ? { bairro:   body.bairro   || null }               : {}),
      ...(body.cidade   !== undefined ? { cidade:   body.cidade   || null }               : {}),
      ...(body.uf       !== undefined ? { uf:       body.uf       || null }               : {}),
      ...(body.cep      !== undefined ? { cep:      body.cep      || null }               : {}),
      ...(body.curso    !== undefined ? { curso:    body.curso    || null }               : {}),
      ...(body.periodo  !== undefined ? { periodo:  body.periodo  || null }               : {}),
      ...(body.previsaoConclusao !== undefined ? { previsaoConclusao: body.previsaoConclusao || null } : {}),
      ...(body.objetivos !== undefined ? { objetivos: body.objetivos || null }             : {}),
      ...(body.habilidades !== undefined ? { habilidades: body.habilidades }              : {}),
      ...(body.idiomas !== undefined ? { idiomas: body.idiomas }                          : {}),
      ...(body.experiencias !== undefined ? { experiencias: body.experiencias }           : {}),
    },
  });
  return NextResponse.json({ student: updated });
}
