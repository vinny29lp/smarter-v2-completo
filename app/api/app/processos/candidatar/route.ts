import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
  // ALTO-D: autenticação obrigatória — rota estava completamente aberta (sem sessão)
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, vacancyId } = await req.json();
  if (!studentId || !vacancyId) return NextResponse.json({ error: "Dados faltando." }, { status: 400 });

  const role = session.user.role || "";

  // ESTUDANTE só pode candidatar a si mesmo
  if (role === "ESTUDANTE") {
    const ownStudentId = (session.user as any).studentId;
    if (!ownStudentId || ownStudentId !== studentId) {
      return NextResponse.json({ error: "Você só pode candidatar a si mesmo." }, { status: 403 });
    }
  }

  // EMPRESA não pode candidatar estudantes diretamente
  if (role === "EMPRESA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const existing = await prisma.application.findUnique({
    where: { studentId_vacancyId: { studentId, vacancyId } },
  });
  if (existing) return NextResponse.json({ error: "Estudante já inscrito nesta vaga." }, { status: 409 });

  const [student, vacancy] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.vacancy.findUnique({ where: { id: vacancyId } }),
  ]);

  if (!student) return NextResponse.json({ error: "Estudante não encontrado." }, { status: 404 });
  if (!vacancy) return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });

  // FRANQUEADO/FUNCIONARIO: só pode candidatar estudantes da própria franquia
  if (role === "FRANQUEADO" || role === "FUNCIONARIO") {
    if (student.franchiseId && student.franchiseId !== session.user.franchiseId) {
      return NextResponse.json({ error: "Estudante não pertence à sua unidade." }, { status: 403 });
    }
  }

  let matching = 60;
  if (student?.discResult && vacancy?.discDesejado) {
    matching = student.discResult === vacancy.discDesejado ? 95 : 65;
  } else if (student?.curso && vacancy?.area) matching = 70;

  const application = await prisma.application.create({
    data: { studentId, vacancyId, matching },
  });
  return NextResponse.json({ application });
  } catch (e) {
    return handleApiError(e, "PROCESSO_CANDIDATAR_POST");
  }
}
