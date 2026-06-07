import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  const franchiseId = session.user.franchiseId;

  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ownership check: impede alteração de candidatura de outra franquia
  if (role !== "FRANQUEADORA") {
    const candidatura = await prisma.application.findUnique({
      where: { id: params.id },
      select: { vacancy: { select: { franchiseId: true } } },
    });
    if (!candidatura || candidatura.vacancy?.franchiseId !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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
  } catch (e) {
    return handleApiError(e, "PROCESSO_ID_PATCH");
  }
}
