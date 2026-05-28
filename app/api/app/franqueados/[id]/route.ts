import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const franchise = await prisma.franchise.findUnique({
    where: { id: params.id },
    include: {
      users: {
        where: { role: "FRANQUEADO" },
        select: { id: true, name: true, email: true, active: true, lastLoginAt: true, createdAt: true },
      },
      companies: { select: { id: true, name: true, status: true } },
      contracts: {
        include: { student: true, company: true },
        orderBy: { createdAt: "desc" },
      },
      financials: { orderBy: { createdAt: "desc" }, take: 30 },
      _count: { select: { companies: true, students: { where: { status: "EM_ESTAGIO" } }, contracts: true } },
    },
  });
  if (!franchise) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  return NextResponse.json({ franchise });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }
  const body = await req.json();

  // Bloquear/desbloquear acesso
  if (body.action === "toggle_access") {
    const users = await prisma.user.findMany({ where: { franchiseId: params.id, role: "FRANQUEADO" } });
    const newActive = !users[0]?.active;
    await prisma.user.updateMany({ where: { franchiseId: params.id, role: "FRANQUEADO" }, data: { active: newActive } });
    return NextResponse.json({ active: newActive });
  }

  // Alterar email de login
  if (body.action === "change_email" && body.userId && body.email) {
    const user = await prisma.user.update({
      where: { id: body.userId },
      data: { email: body.email },
    });
    return NextResponse.json({ user });
  }

  // Alterar senha
  if (body.action === "change_password" && body.userId && body.password) {
    const hash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({ where: { id: body.userId }, data: { password: hash } });
    return NextResponse.json({ ok: true });
  }

  // Toggle cobrarMensalidade
  if (body.action === "toggle_mensalidade") {
    const current = await prisma.franchise.findUnique({ where: { id: params.id }, select: { cobrarMensalidade: true } });
    const franchise = await prisma.franchise.update({
      where: { id: params.id },
      data: { cobrarMensalidade: !(current?.cobrarMensalidade ?? true) },
    });
    return NextResponse.json({ franchise, cobrarMensalidade: franchise.cobrarMensalidade });
  }

  // Atualizar dados da franquia
  const franchise = await prisma.franchise.update({
    where: { id: params.id },
    data: {
      name: body.name, razaoSocial: body.razaoSocial, cnpj: body.cnpj,
      responsavel: body.responsavel, email: body.email, telefone: body.telefone,
      cidade: body.cidade, uf: body.uf, endereco: body.endereco,
      mensalidade: body.mensalidade ? parseFloat(body.mensalidade) : undefined,
      cobrarMensalidade: body.cobrarMensalidade !== undefined ? body.cobrarMensalidade : undefined,
      status: body.status,
    },
  });
  return NextResponse.json({ franchise });
}
