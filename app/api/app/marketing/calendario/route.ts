import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO", "EQUIPE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const mes  = searchParams.get("mes");
    const ano  = searchParams.get("ano");

    const db = prisma as any;
    let where: any = {};

    if (mes && ano) {
      const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      const fim    = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);
      where = { data: { gte: inicio, lte: fim } };
    } else {
      // padrão: próximos 3 meses
      const hoje = new Date();
      const fim  = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0);
      where = { data: { gte: hoje, lte: fim } };
    }

    const eventos = await db.marketingCalendario.findMany({
      where,
      include: {
        campanha: { select: { id: true, nome: true, cor: true } },
      },
      orderBy: { data: "asc" },
    });

    return NextResponse.json({ eventos });
  } catch (e: any) {
    console.error("[marketing/calendario] GET:", e?.message);
    return NextResponse.json({ error: "Erro ao carregar calendário." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isMarketingAdmin = session.user.role === "FRANQUEADORA" ||
    (session.user.role === "EQUIPE" && Array.isArray((session.user as any).permissoes) && (session.user as any).permissoes.includes("marketing"));
  if (!isMarketingAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const { titulo, descricao, data, tipo, cor, campanhaId, conteudoId, recorrente } = await req.json();
    if (!titulo || !data) {
      return NextResponse.json({ error: "Título e data são obrigatórios." }, { status: 400 });
    }

    const db = prisma as any;
    const evento = await db.marketingCalendario.create({
      data: {
        titulo, descricao,
        data: new Date(data),
        tipo: tipo || "PUBLICACAO",
        cor, campanhaId: campanhaId || null,
        conteudoId: conteudoId || null,
        recorrente: recorrente || false,
      },
    });

    return NextResponse.json({ evento });
  } catch (e: any) {
    console.error("[marketing/calendario] POST:", e?.message);
    return NextResponse.json({ error: "Erro ao criar evento." }, { status: 500 });
  }
}
