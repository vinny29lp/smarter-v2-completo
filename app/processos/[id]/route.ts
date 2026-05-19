import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const app = await prisma.application.update({
    where: { id: params.id },
    data: {
      ...(body.etapa             !== undefined ? { etapa: body.etapa }                         : {}),
      ...(body.anotacao          !== undefined ? { anotacao: body.anotacao }                   : {}),
      ...(body.anotacaoInterna   !== undefined ? { anotacaoInterna: body.anotacaoInterna }     : {}),
      ...(body.parecerTecnico    !== undefined ? { parecerTecnico: body.parecerTecnico }       : {}),
      ...(body.entrevistaAt      !== undefined ? { entrevistaAt: body.entrevistaAt ? new Date(body.entrevistaAt) : null } : {}),
      ...(body.entrevistaLocal   !== undefined ? { entrevistaLocal: body.entrevistaLocal }     : {}),
      ...(body.entrevistaLink    !== undefined ? { entrevistaLink: body.entrevistaLink }       : {}),
      ...(body.recomendacao      !== undefined ? { recomendacao: body.recomendacao }           : {}),
    },
    include: { student: true, vacancy: { include: { company: true } } },
  });
  return NextResponse.json({ application: app });
}
