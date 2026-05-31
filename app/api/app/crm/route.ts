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

  // Isolamento de CRM por perfil:
  // • FRANQUEADORA (admin): vê TODOS os leads (visão global de gestão)
  // • FRANQUEADO / FUNCIONARIO: vê apenas os leads da sua unidade
  const isAdmin = session.user.role === "FRANQUEADORA";

  const franchiseFilter = isAdmin
    ? {}                                                   // admin: todos os leads
    : { franchiseId: session.user.franchiseId ?? "" };     // unidade: apenas os seus

  const where: any = {
    ...franchiseFilter,
    ...(situacao !== "todos" ? { situacao } : {}),
  };

  try {
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
  } catch (e: any) {
    console.error("[crm] findMany error:", e?.message || e);
    return NextResponse.json(
      { error: "Erro ao carregar leads.", leads: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const isAdmin = session.user.role === "FRANQUEADORA";

  // Admin (FRANQUEADORA) precisa de um franchiseId válido para criar leads.
  // O franchiseId do usuário admin aponta para a unidade sede (Smarter HQ).
  const franchiseIdParaLead = session.user.franchiseId;
  if (!franchiseIdParaLead) {
    return NextResponse.json(
      { error: "Usuário sem franquia vinculada. Configure a franquia do usuário administrador no painel." },
      { status: 400 }
    );
  }

  const createData: any = {
    empresa:     body.empresa,
    contato:     body.contato     || null,
    email:       body.email       || null,
    telefone:    body.telefone    || null,
    proximaAcao: body.proximaAcao || null,
    retornoAt:   body.retornoAt   ? new Date(body.retornoAt) : null,
    situacao:    "ativo",
    franchiseId: franchiseIdParaLead,
  };

  try {
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
  } catch (e: any) {
    console.error("[crm] create lead error:", e?.message || e);
    return NextResponse.json({ error: "Erro ao criar lead: " + (e?.message || "tente novamente.") }, { status: 500 });
  }
}
