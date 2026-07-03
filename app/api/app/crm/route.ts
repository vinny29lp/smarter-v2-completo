import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";
import { criarLeadSchema, zodError } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "crm");
  if (permCheck) return permCheck;

  const { searchParams } = new URL(req.url);
  const situacao = searchParams.get("situacao") || "ativo";
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip  = (page - 1) * limit;

  // FRANQUEADORA (franchiseId null) vê apenas seus leads (franchiseId IS NULL)
  // FRANQUEADO vê apenas leads da sua franquia
  const role = session.user.role;
  const franchiseFilter =
    role === "FRANQUEADORA"
      ? { franchiseId: null }
      : { franchiseId: session.user.franchiseId ?? "" };

  const where: any = {
    ...franchiseFilter,
    ...(situacao !== "todos" ? { situacao } : {}),
  };

  try {
    const [leads, total] = await Promise.all([
      prisma.crmLead.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          tasks: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 3 },
          notas: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { notas: true, tasks: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.crmLead.count({ where }),
    ]);

    return NextResponse.json({ leads, total, page, totalPages: Math.ceil(total / limit) });
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

  const permCheck = checkPermission(session, "crm");
  if (permCheck) return permCheck;

  const rawBody = await req.json();
  const parsed = criarLeadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(zodError(parsed.error), { status: 400 });
  }
  const body = parsed.data;

  // FRANQUEADORA cria lead sem franchiseId (null) — pertence somente a ela
  // FRANQUEADO usa o próprio franchiseId da sessão
  const role = session.user.role;
  const franchiseIdParaLead =
    role === "FRANQUEADORA" ? null : (session.user.franchiseId ?? null);

  const createData: any = {
    empresa:        body.empresa,
    contato:        body.contato        || null,
    cargo:          body.cargo          || null,
    email:          body.email          || null,
    telefone:       body.telefone       || null,
    whatsapp:       body.whatsapp       || null,
    instagram:      body.instagram      || null,
    linkedin:       body.linkedin       || null,
    cidade:         body.cidade         || null,
    uf:             body.uf             || null,
    setor:          body.setor          || null,
    origem:         body.origem         || null,
    prioridade:     body.prioridade     || "media",
    valorNegociado: body.valorNegociado ?? null,
    proximaAcao:    body.proximaAcao    ? String(body.proximaAcao).slice(0, 500) : null,
    retornoAt:      body.retornoAt      ? new Date(body.retornoAt) : null,
    situacao:       "ativo",
    etapaChangedAt: new Date(),
    franchiseId:    franchiseIdParaLead,
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
        data: { leadId: lead.id, texto: String(body.observacao).slice(0, 2000), tipo: "anotacao" },
      });
    }

    // Audit log
    logAudit({
      userId: session.user.id,
      role: session.user.role || "",
      franchiseId: franchiseIdParaLead || undefined,
      acao: "CRM_LEAD_CRIADO",
      modulo: "crm",
      detalhes: `lead:${lead.id} | empresa:${body.empresa}`,
      ip: getClientIP(req),
    });

    return NextResponse.json({ lead });
  } catch (e: any) {
    console.error("[crm] create lead error:", e?.message || e);
    return NextResponse.json({ error: "Erro ao criar lead: " + (e?.message || "tente novamente.") }, { status: 500 });
  }
}
