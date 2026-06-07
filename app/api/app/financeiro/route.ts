import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAudit, getClientIP } from "@/lib/audit";
import { criarLancamentoSchema, zodError } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "";
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "FUNCIONARIO") {
    const permissoes: string[] = (session.user as any)?.permissoes ?? [];
    if (!permissoes.includes("financeiro")) {
      return NextResponse.json({ error: "Acesso negado. Sem permissão para financeiro." }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip  = (page - 1) * limit;

  const where: any = session?.user?.franchiseId
    ? { franchiseId: session.user.franchiseId }
    : { OR: [{ franchiseId: null }, { categoria: "Franquia" }] };

  const [lancamentos, total] = await Promise.all([
    prisma.financial.findMany({
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
      skip,
      take: limit,
    }),
    prisma.financial.count({ where }),
  ]);

  return NextResponse.json({ lancamentos, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return handleApiError(e, "FINANCEIRO_GET_001");
  }
}

export async function POST(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const postRole = session.user.role || "";
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(postRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (postRole === "FUNCIONARIO") {
    const permissoes: string[] = (session.user as any)?.permissoes ?? [];
    if (!permissoes.includes("financeiro")) {
      return NextResponse.json({ error: "Acesso negado. Sem permissão para financeiro." }, { status: 403 });
    }
  }

  const rawBody = await req.json();
  const parsed = criarLancamentoSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(zodError(parsed.error), { status: 400 });
  }
  const body = parsed.data;

  const lancamento = await prisma.financial.create({
    data: {
      descricao: String(body.descricao).slice(0, 500),
      tipo: body.tipo,
      valor: parseFloat(String(body.valor)),
      categoria: body.categoria,
      status: (body.status || "PENDENTE") as any,
      recorrente: body.recorrente || false,
      diaVencimento: body.diaVencimento != null ? parseInt(String(body.diaVencimento)) : null,
      vencimentoAt: body.vencimentoAt ? new Date(body.vencimentoAt) : null,
      franchiseId: session?.user?.franchiseId || undefined,
      companyId: body.companyId || undefined,
    },
    include: { company: true },
  });

  // Audit log
  logAudit({
    userId: session.user.id,
    role: postRole,
    franchiseId: session.user.franchiseId || undefined,
    acao: "FINANCEIRO_CRIADO",
    modulo: "financeiro",
    detalhes: `lancamento:${lancamento.id} | tipo:${body.tipo} | valor:${body.valor} | categoria:${body.categoria}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ lancamento });
  } catch (e) {
    return handleApiError(e, "FINANCEIRO_POST_001");
  }
}
