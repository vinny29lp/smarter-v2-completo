import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { handleApiError } from "@/lib/api-response";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "";
  if (!["FRANQUEADORA", "FRANQUEADO"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const { cargo, permissoes, active, name, email, novaSenha } = body;

  const emp = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // FRANQUEADORA pode gerenciar apenas membros EQUIPE (franchiseId=null)
  // FRANQUEADO pode gerenciar apenas colaboradores da sua própria unidade
  if (role === "FRANQUEADORA") {
    if (emp.franchiseId !== null || emp.user.role !== "EQUIPE") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    // FRANQUEADO: só sua unidade, nunca EQUIPE
    if (emp.franchiseId !== session.user.franchiseId || emp.user.role === "EQUIPE") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

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
    // Apenas FRANQUEADORA e FRANQUEADO podem alterar senhas de colaboradores
    if (!["FRANQUEADORA", "FRANQUEADO"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Apenas FRANQUEADORA ou FRANQUEADO podem alterar senhas" }, { status: 403 });
    }
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
  } catch (e) {
    return handleApiError(e, "EQUIPE_ID_PATCH");
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "";
  if (!["FRANQUEADORA", "FRANQUEADO"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const emp = await prisma.employee.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // FRANQUEADORA pode excluir apenas membros EQUIPE
  // FRANQUEADO pode excluir apenas colaboradores da sua unidade, nunca EQUIPE
  if (role === "FRANQUEADORA") {
    if (emp.franchiseId !== null || emp.user.role !== "EQUIPE") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    if (emp.franchiseId !== session.user.franchiseId || emp.user.role === "EQUIPE") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Delete employee record then deactivate user
  await prisma.employee.delete({ where: { id: params.id } });
  await prisma.user.update({ where: { id: emp.userId }, data: { active: false } });

  return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "EQUIPE_ID_DELETE");
  }
}
