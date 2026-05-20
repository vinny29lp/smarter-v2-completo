import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const inst = await prisma.institution.findUnique({ where: { id: params.id } });
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ instituicao: inst });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const inst = await prisma.institution.update({
    where: { id: params.id },
    data: {
      name: body.name,
      razaoSocial: body.razaoSocial,
      cnpj: body.cnpj,
      tipo: body.tipo,
      email: body.email,
      telefone: body.telefone,
      coordenador: body.coordenador,
      cargoCoord: body.cargoCoord,
      endereco: body.endereco,
      cidade: body.cidade,
      uf: body.uf,
      cep: body.cep,
      site: body.site,
      cursos: body.cursos || [],
    },
  });
  return NextResponse.json({ instituicao: inst });
}
