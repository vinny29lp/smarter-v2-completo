import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.franchiseId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    where: { franchiseId: session.user.franchiseId },
    include: { user: { select: { id: true, name: true, email: true, active: true, role: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ employees });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.franchiseId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, cargo, permissoes = [], senha } = body;

  if (!name || !email) return NextResponse.json({ error: "Nome e e-mail são obrigatórios" }, { status: 400 });
  if (!senha || senha.length < 6) return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "E-mail já cadastrado no sistema" }, { status: 409 });

  const hash = await bcrypt.hash(senha, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role: "FUNCIONARIO" as any,
      franchiseId: session.user.franchiseId,
      active: true,
    },
  });

  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      franchiseId: session.user.franchiseId,
      cargo: cargo || "Colaborador",
      permissoes,
    },
    include: { user: { select: { id: true, name: true, email: true, active: true, role: true, createdAt: true } } },
  });

  return NextResponse.json({ employee }, { status: 201 });
}
