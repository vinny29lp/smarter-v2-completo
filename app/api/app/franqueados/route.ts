import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }
  const franqueados = await prisma.franchise.findMany({
    include: {
      users: {
        where: { role: "FRANQUEADO" },
        select: { id: true, name: true, email: true, active: true, lastLoginAt: true, createdAt: true },
      },
      _count: { select: { companies: true, students: { where: { status: "EM_ESTAGIO" } }, contracts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ franqueados });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }
  const body = await req.json();

  // Criar franquia
  const franchise = await prisma.franchise.create({
    data: {
      name: body.name, razaoSocial: body.razaoSocial, cnpj: body.cnpj,
      responsavel: body.responsavel, email: body.email, telefone: body.telefone,
      cidade: body.cidade, uf: body.uf, endereco: body.endereco, cep: body.cep,
      mensalidade: parseFloat(body.mensalidade) || 200,
      plano: body.plano || "completo",
    },
  });

  // Gerar senha aleatória
  const senha = body.senha || Math.random().toString(36).slice(-8) + "S1@";
  const hash = await bcrypt.hash(senha, 10);

  // Criar usuário do franqueado
  const user = await prisma.user.create({
    data: {
      name: body.responsavel,
      email: body.emailLogin || body.email,
      password: hash,
      role: "FRANQUEADO",
      franchiseId: franchise.id,
    },
  });

  return NextResponse.json({ franchise, user, senhaGerada: senha });
}
