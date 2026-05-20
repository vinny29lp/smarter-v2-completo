import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const where = session?.user?.franchiseId ? { franchiseId: session.user.franchiseId } : {};
  const lancamentos = await prisma.financial.findMany({
    where, include: { company: true, contract: { include: { student: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ lancamentos });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const lancamento = await prisma.financial.create({
    data: {
      descricao: body.descricao,
      tipo: body.tipo,
      valor: parseFloat(body.valor),
      categoria: body.categoria,
      status: (body.status || "PENDENTE") as any,
      recorrente: body.recorrente || false,
      diaVencimento: body.diaVencimento ? parseInt(body.diaVencimento) : null,
      vencimentoAt: body.vencimentoAt ? new Date(body.vencimentoAt) : null,
      franchiseId: session?.user?.franchiseId || undefined,
      companyId: body.companyId || undefined,
    },
    include: { company: true },
  });
  return NextResponse.json({ lancamento });
}
