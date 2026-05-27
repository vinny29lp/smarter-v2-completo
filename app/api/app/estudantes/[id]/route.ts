import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewerFranchiseId = (session?.user as any)?.franchiseId;

  const estudante = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, active: true, lastLoginAt: true } },
      institution: true,
      contracts: {
        where: viewerFranchiseId ? { franchiseId: viewerFranchiseId } : {},
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

  // Atualização geral de dados do estudante
  const estudante = await prisma.student.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ estudante });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Apenas FRANQUEADORA pode excluir estudantes" }, { status: 403 });
  }

  const estudante = await prisma.student.findUnique({ where: { id: params.id } });
  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Delete internship documents related to student's contracts
    await tx.internshipDocument.deleteMany({ where: { contract: { studentId: params.id } } });
    // Delete contracts
    await tx.contract.deleteMany({ where: { studentId: params.id } });
    // Delete applications
    await tx.application.deleteMany({ where: { studentId: params.id } });
    // Delete the user account if it exists
    if (estudante.userId) {
      await tx.user.delete({ where: { id: estudante.userId } }).catch(() => null);
    }
    // Delete the student
    await tx.student.delete({ where: { id: params.id } });
  });

  return NextResponse.json({ ok: true });
}
