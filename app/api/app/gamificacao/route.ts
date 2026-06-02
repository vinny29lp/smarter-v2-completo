import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  // SEC-M06: autenticação obrigatória — gamificação não é dado público
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fid = session?.user?.franchiseId;

  const [pontos, configs, allPoints] = await Promise.all([
    prisma.gamificationPoint.findMany({
      where: fid ? { franchiseId: fid } : {},
      orderBy: { createdAt: "desc" }, take: 50,
    }),
    prisma.gamificationConfig.findMany({
      where: { franchiseId: null },
      orderBy: { acao: "asc" },
    }),
    // Ranking: agrupar por franchise
    prisma.gamificationPoint.groupBy({
      by: ["franchiseId"],
      _sum: { pontos: true },
      orderBy: { _sum: { pontos: "desc" } },
    }),
  ]);

  // Buscar nomes das franquias para o ranking
  const fids = allPoints.map(p => p.franchiseId);
  const franchises = await prisma.franchise.findMany({
    where: { id: { in: fids } }, select: { id: true, name: true }
  });
  const fMap = Object.fromEntries(franchises.map(f => [f.id, f.name]));

  const ranking = allPoints.map(p => ({
    franchiseId: p.franchiseId,
    name: fMap[p.franchiseId] || p.franchiseId,
    total: p._sum.pontos || 0,
  }));

  return NextResponse.json({ pontos, configs, ranking });
}
