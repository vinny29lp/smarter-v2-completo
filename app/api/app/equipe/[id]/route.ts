import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.franchiseId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cargo, permissoes, active } = body;

  const emp = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!emp || emp.franchiseId !== session.user.franchiseId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: any = {};
  if (cargo !== undefined)      updates.cargo      = cargo;
  if (permissoes !== undefined) updates.permissoes = permissoes;

  const employee = await prisma.employee.update({
    where: { id: params.id },
    data: updates,
    include: { user: { select: { id: true, name: true, email: true, active: true } } },
  });

  if (active !== undefined) {
    await prisma.user.update({ where: { id: emp.userId }, data: { active } });
  }

  return NextResponse.json({ employee });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.franchiseId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const emp = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!emp || emp.franchiseId !== session.user.franchiseId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Desativar usuário em vez de deletar
  await prisma.user.update({ where: { id: emp.userId }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
