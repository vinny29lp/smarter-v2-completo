import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
  const body = await req.json();
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
