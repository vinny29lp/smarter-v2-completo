import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/app/marketing/downloads — registra um download e incrementa contador
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { conteudoId } = await req.json();
    if (!conteudoId) return NextResponse.json({ error: "conteudoId obrigatório." }, { status: 400 });

    const db = prisma as any;

    // Log do download
    await db.marketingDownload.create({
      data: {
        conteudoId,
        userId: session.user.id,
        franchiseId: (session.user as any).franchiseId || null,
      },
    });

    // Incrementar contador
    await db.marketingConteudo.update({
      where: { id: conteudoId },
      data: { totalDownloads: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[marketing/downloads] POST:", e?.message);
    return NextResponse.json({ error: "Erro ao registrar download." }, { status: 500 });
  }
}

// GET /api/app/marketing/downloads — ranking de downloads (admin)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const db = prisma as any;
    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get("periodo") || "30"; // dias
    const desde = new Date();
    desde.setDate(desde.getDate() - parseInt(periodo));

    const downloads = await db.marketingDownload.groupBy({
      by: ["conteudoId", "franchiseId"],
      where: { createdAt: { gte: desde } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 50,
    });

    // Buscar nomes dos conteúdos
    const conteudoIds = [...new Set(downloads.map((d: any) => d.conteudoId))];
    const conteudos = await db.marketingConteudo.findMany({
      where: { id: { in: conteudoIds } },
      select: { id: true, titulo: true, tipo: true, categoria: true },
    });
    const conteudoMap = Object.fromEntries(conteudos.map((c: any) => [c.id, c]));

    const result = downloads.map((d: any) => ({
      conteudoId: d.conteudoId,
      franchiseId: d.franchiseId,
      total: d._count.id,
      conteudo: conteudoMap[d.conteudoId] || null,
    }));

    return NextResponse.json({ downloads: result });
  } catch (e: any) {
    console.error("[marketing/downloads] GET:", e?.message);
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}
