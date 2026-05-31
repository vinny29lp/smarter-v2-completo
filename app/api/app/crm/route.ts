import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const situacao = searchParams.get("situacao") || "ativo";

  // Isolamento total de CRM por perfil:
  // • FRANQUEADORA (admin): vê APENAS leads sem franchiseId — seu CRM de vendas de franquias
  // • FRANQUEADO / FUNCIONARIO: vê apenas os leads da sua unidade
  const isAdmin = session.user.role === "FRANQUEADORA";

  const franchiseFilter = isAdmin
    ? { franchiseId: null }                               // admin: apenas leads sem unidade
    : { franchiseId: session.user.franchiseId ?? "" };    // unidade: apenas os seus

  const where: any = {
    ...franchiseFilter,
    ...(situacao !== "todos" ? { situacao } : {}),
  };

  const leads = await prisma.crmLead.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } },
      tasks: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 3 },
      notas: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { notas: true, tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const isAdmin = session.user.role === "FRANQUEADORA";

  const createData: any = {
    empresa:     body.empresa,
    contato:     body.contato     || null,
    email:       body.email       || null,
    telefone:    body.telefone    || null,
    proximaAcao: body.proximaAcao || null,
    retornoAt:   body.retornoAt   ? new Date(body.retornoAt) : null,
    situacao:    "ativo",
    // Admin cria lead sem unidade (venda de franquias); unidade cria com a sua própria.
    // null → campo fica NULL no banco para leads do admin
    franchiseId: isAdmin ? null : (session.user.franchiseId || null),
  };

  const lead = await prisma.crmLead.create({
    data: createData,
    include: {
      tasks: true,
      notas: true,
      _count: { select: { notas: true, tasks: true } },
    },
  });

  if (body.observacao) {
    await prisma.crmNota.create({
      data: { leadId: lead.id, texto: body.observacao, tipo: "anotacao" },
    });
  }

  return NextResponse.json({ lead });
}
