import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.franchiseId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cargo, permissoes, active, name, email, novaSenha } = body;

  const emp = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!emp || emp.franchiseId !== session.user.franchiseId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update employee fields
  const empUpdates: any = {};
  if (cargo !== undefined)      empUpdates.cargo      = cargo;
  if (permissoes !== undefined) empUpdates.permissoes = permissoes;

  if (Object.keys(empUpdates).length > 0) {
    await prisma.employee.update({ where: { id: params.id }, data: empUpdates });
  }

  // Update user fields
  const userUpdates: any = {};
  if (name   !== undefined) userUpdates.name   = name;
  if (active !== undefined) userUpdates.active = active;
  if (email  !== undefined && email !== emp.user.email) {
    const emailTaken = await prisma.user.findFirst({ where: { email, NOT: { id: emp.userId } } });
    if (emailTaken) return NextResponse.json({ error: "E-mail já em uso por outro usuário" }, { status: 409 });
    userUpdates.email = email;
  }
  if (novaSenha) {
    if (novaSenha.length < 6) return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    userUpdates.password = await bcrypt.hash(novaSenha, 10);
  }

  if (Object.keys(userUpdates).length > 0) {
    await prisma.user.update({ where: { id: emp.userId }, data: userUpdates });
  }

  const updated = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true, email: true, active: true, role: true, createdAt: true } } },
  });

  return NextResponse.json({ employee: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.franchiseId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const emp = await prisma.employee.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!emp || emp.franchiseId !== session.user.franchiseId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete employee record then deactivate user
  await prisma.employee.delete({ where: { id: params.id } });
  await prisma.user.update({ where: { id: emp.userId }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
