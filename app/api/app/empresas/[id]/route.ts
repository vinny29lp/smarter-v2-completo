import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const empresa = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      franchise: true,
      contracts: { include: { student: true, documents: true }, orderBy: { createdAt: "desc" } },
      vacancies: { include: { _count: { select: { applications: true } } }, orderBy: { createdAt: "desc" } },
      crmLeads: { orderBy: { updatedAt: "desc" }, take: 10 },
      financials: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!empresa) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ empresa });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  // Alterar senha do usuário da empresa — requer FRANQUEADORA ou FRANQUEADO
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

  // Alterar e-mail de login da empresa — requer FRANQUEADORA ou FRANQUEADO
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

  // Atualização geral de dados da empresa
  const empresa = await prisma.company.update({
    where: { id: params.id },
    data: {
      ...(body.status    !== undefined ? { status: body.status }       : {}),
      ...(body.pendente  !== undefined ? { pendente: body.pendente }   : {}),
      ...(body.name      !== undefined ? { name: body.name }           : {}),
      ...(body.razaoSocial ? { razaoSocial: body.razaoSocial }        : {}),
      ...(body.cnpj      ? { cnpj: body.cnpj }                        : {}),
      ...(body.email     ? { email: body.email }                       : {}),
      ...(body.telefone  ? { telefone: body.telefone }                 : {}),
      ...(body.responsavel ? { responsavel: body.responsavel }         : {}),
      ...(body.cargoResponsavel ? { cargoResponsavel: body.cargoResponsavel } : {}),
      ...(body.cidade    ? { cidade: body.cidade }                     : {}),
      ...(body.uf        ? { uf: body.uf }                             : {}),
      ...(body.endereco  ? { endereco: body.endereco }                 : {}),
      ...(body.setor     ? { setor: body.setor }                       : {}),
      ...(body.site      ? { site: body.site }                         : {}),
    },
  });
  return NextResponse.json({ empresa });
}
