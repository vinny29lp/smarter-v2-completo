import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "EMPRESA") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find company linked to this user
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  });
  if (!user?.companyId) return NextResponse.json({ contratos: [] });

  const contratos = await prisma.contract.findMany({
    where: { companyId: user.companyId, status: { in: ["ATIVO", "PENDENTE"] } },
    include: {
      student: { select: { name: true, curso: true } },
      evaluations: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contratos });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "EMPRESA") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contratoId, respostas, observacoes } = await req.json();
  if (!contratoId || !respostas) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
  }

  // Verify the contract belongs to this company's user
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  });
  const contract = await prisma.contract.findUnique({ where: { id: contratoId } });
  if (!contract || contract.companyId !== user?.companyId) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      contractId: contratoId,
      tipo: "semestral",
      respostas,
      observacoes: observacoes || null,
      status: "respondido",
      respondidoAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, evaluation }, { status: 201 });
}
