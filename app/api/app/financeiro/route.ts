import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  // FUNCIONARIO: verificar permissão financeiro
  if (role === "FUNCIONARIO") {
    const permissoes: string[] = (session.user as any)?.permissoes ?? [];
    if (!permissoes.includes("financeiro")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  // FRANQUEADO: vê só os lançamentos da sua unidade
  // FRANQUEADORA: vê apenas seus próprios lançamentos (sem franchiseId) + cobranças de franquia (categoria "Franquia")
  //               NÃO vê Taxa Admin ou outros lançamentos internos das unidades
  const where: any = session?.user?.franchiseId
    ? { franchiseId: session.user.franchiseId }
    : { OR: [{ franchiseId: null }, { categoria: "Franquia" }] };
  // ⚡ Otimizado: include mais leve + take reduzido de 500 → 200
  const lancamentos = await prisma.financial.findMany({
    where,
    select: {
      id: true, descricao: true, tipo: true, valor: true, categoria: true,
      status: true, recorrente: true, diaVencimento: true, vencimentoAt: true,
      cancelado: true, paidAt: true, createdAt: true,
      franchiseId: true, companyId: true, contractId: true,
      company:   { select: { id: true, name: true, email: true, emailFinanceiro: true } },
      franchise: { select: { id: true, name: true, email: true } },
      contract:  { select: { id: true, numero: true, student: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ lancamentos });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const postRole = session.user.role || "";
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(postRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // FUNCIONARIO: verificar permissão financeiro
  if (postRole === "FUNCIONARIO") {
    const permissoes: string[] = (session.user as any)?.permissoes ?? [];
    if (!permissoes.includes("financeiro")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
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
