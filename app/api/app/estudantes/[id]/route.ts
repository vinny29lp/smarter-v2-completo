import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  // SEC-A06: guarda explícita de autenticação
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const estudante = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, active: true, lastLoginAt: true } },
      institution: true,
      contracts: {
        include: { company: true },
        orderBy: { createdAt: "desc" },
      },
      applications: { include: { vacancy: { include: { company: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!estudante) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ estudante });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  // Alterar senha do estudante — requer FRANQUEADORA ou FRANQUEADO
  if (body.action === "change_password") {
    if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session?.user?.role || "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
    if (!body.userId || !body.password) {
      return NextResponse.json({ error: "userId e password são obrigatórios" }, { status: 400 });
    }
    const hash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({ where: { id: body.userId }, data: { password: hash } });
    return NextResponse.json({ ok: true });
  }

  // Alterar e-mail de login do estudante — requer FRANQUEADORA ou FRANQUEADO
  if (body.action === "change_email") {
    if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session?.user?.role || "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
    if (!body.userId || !body.email) {
      return NextResponse.json({ error: "userId e email são obrigatórios" }, { status: 400 });
    }
    await prisma.user.update({ where: { id: body.userId }, data: { email: body.email } });
    return NextResponse.json({ ok: true });
  }

  // Reativar / alterar status — requer FRANQUEADORA
  if (body.status !== undefined) {
    if (session?.user?.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Apenas FRANQUEADORA pode alterar o status do estudante" }, { status: 403 });
    }
  }

  // Ownership check: FRANQUEADO/FUNCIONARIO só edita estudante da própria franquia
  const role = session?.user?.role || "";
  const franchiseId = session?.user?.franchiseId;
  if (role !== "FRANQUEADORA") {
    const existing = await prisma.student.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!existing || (existing.franchiseId && existing.franchiseId !== franchiseId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // SEC-A05: allowlist explícita de campos editáveis — proíbe mass assignment
  // Campos bloqueados: franchiseId, userId, status (gerenciado acima), discResult, discData
  const allowed = [
    "name","cpf","rg","dataNasc","sexo","email","celular","telefone",
    "endereco","bairro","cidade","uf","cep",
    "curso","periodo","previsaoConclusao","turno",
    "habilidades","idiomas","experiencias","objetivos","curriculo",
    "linkedin","portfolio","observacoes",
    "institutionId",
    "menorDeIdade","nomeResponsavel",
  ];
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  // institutionId vazio ("") não é um FK válido — normaliza para null
  if (data.institutionId === "") data.institutionId = null;
  // Franqueadora pode atualizar status diretamente (já validado acima)
  if (body.status !== undefined && role === "FRANQUEADORA") {
    data.status = body.status;
  }

  try {
    const estudante = await prisma.student.update({ where: { id: params.id }, data });
    return NextResponse.json({ estudante });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao atualizar estudante." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Apenas FRANQUEADORA pode excluir estudantes" }, { status: 403 });
  }

  const estudante = await prisma.student.findUnique({ where: { id: params.id } });
  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      // Delete evaluations linked to student's contracts
      await tx.evaluation.deleteMany({ where: { contract: { studentId: params.id } } });
      // Delete internship documents related to student's contracts
      await tx.internshipDocument.deleteMany({ where: { contract: { studentId: params.id } } });
      // Delete financials linked to student's contracts
      await tx.financial.deleteMany({ where: { contract: { studentId: params.id } } });
      // Delete contracts
      await tx.contract.deleteMany({ where: { studentId: params.id } });
      // Delete applications
      await tx.application.deleteMany({ where: { studentId: params.id } });
      // Delete DISC tests
      await tx.discTest.deleteMany({ where: { studentId: params.id } });
      // Delete student FIRST (frees the FK userId → User)
      await tx.student.delete({ where: { id: params.id } });
      if (estudante.userId) {
        // Limpar logs e notificações antes de deletar o usuário (FK NoAction)
        await tx.activityLog.deleteMany({ where: { userId: estudante.userId } });
        await tx.notification.deleteMany({ where: { userId: estudante.userId } });
        await tx.user.delete({ where: { id: estudante.userId } });
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao excluir estudante." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
