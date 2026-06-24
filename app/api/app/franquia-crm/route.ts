/**
 * GET  /api/app/franquia-crm  — lista leads de franquias (com filtros)
 * POST /api/app/franquia-crm  — cria novo lead manual
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { FRANQUIA_PIPELINE } from "@/lib/crm/franquia-pipeline";
import { nanoid } from "nanoid";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso restrito à Franqueadora" }, { status: 403 });
    }

    const url = new URL(req.url);
    const etapa    = url.searchParams.get("etapa")    || undefined;
    const situacao = url.searchParams.get("situacao") || undefined;
    const frio     = url.searchParams.get("frio");
    const q        = url.searchParams.get("q")        || undefined;

    const leads = await prisma.franquiaLead.findMany({
      where: {
        ...(etapa    ? { etapa }    : {}),
        ...(situacao ? { situacao } : { situacao: { in: ["ativo", "vendido"] } }),
        ...(frio !== null ? { leadFrio: frio === "true" } : {}),
        ...(q ? {
          OR: [
            { nomeCompleto: { contains: q, mode: "insensitive" } },
            { email:       { contains: q, mode: "insensitive" } },
            { telefone:    { contains: q, mode: "insensitive" } },
            { cidade:      { contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        notas:   { orderBy: { createdAt: "desc" }, take: 1 },
        tarefas: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 1 },
      },
    });

    // KPIs rápidos
    const todos = await prisma.franquiaLead.findMany({
      where: { situacao: { in: ["ativo", "vendido", "perdido"] } },
      select: { etapa: true, situacao: true, leadFrio: true, valorInvestimento: true },
    });

    const kpis = {
      total:    todos.length,
      ativos:   todos.filter((l) => l.situacao === "ativo").length,
      vendidos: todos.filter((l) => l.situacao === "vendido").length,
      perdidos: todos.filter((l) => l.situacao === "perdido").length,
      frios:    todos.filter((l) => l.leadFrio).length,
      mrrForecast: 0,
      mrrReal: 0,
    };

    return NextResponse.json({ leads, kpis });
  } catch (e) {
    return handleApiError(e, "FRANQUIA_CRM_LIST");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso restrito à Franqueadora" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.nomeCompleto) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    }

    const lead = await prisma.franquiaLead.create({
      data: {
        id: nanoid(),
        nomeCompleto:  body.nomeCompleto.trim(),
        email:         body.email     || null,
        telefone:      body.telefone  || null,
        cidade:        body.cidade    || null,
        estado:        body.estado    || null,
        etapa:         body.etapa     || "novo_lead",
        origem:        body.origem    || "manual",
        optIn:         body.optIn     ?? true,
        anotacao:      body.anotacao  || null,
        etapaChangedAt: new Date(),
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "FRANQUIA_CRM_CREATE");
  }
}
