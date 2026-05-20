import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dias  = parseInt(searchParams.get("dias")  || "30");
  const limit = parseInt(searchParams.get("limit") || "50");

  const franchiseId = session.user.franchiseId;
  const role = (session.user as any).role;

  // Somente admins e franqueados
  if (!["FRANQUEADORA", "FRANQUEADO"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const since = new Date();
  since.setDate(since.getDate() - dias);

  const where = role === "FRANQUEADORA"
    ? { createdAt: { gte: since } }
    : { franchiseId, createdAt: { gte: since } };

  const [logs, stats] = await Promise.all([
    prisma.aIUsageLog.findMany({
      where, orderBy: { createdAt: "desc" }, take: limit,
    }),
    prisma.aIUsageLog.groupBy({
      by: ["tipoUso"],
      where,
      _count: { id: true },
      _sum: { totalTokens: true, custoEstimado: true },
    }),
  ]);

  const totalCusto = logs.reduce((s, l) => s + l.custoEstimado, 0);
  const totalTokens = logs.reduce((s, l) => s + l.totalTokens, 0);

  return NextResponse.json({
    logs,
    stats,
    resumo: {
      totalChamadas: logs.length,
      totalTokens,
      custoTotal: totalCusto,
      custoFormatado: `$${totalCusto.toFixed(4)} USD`,
    },
  });
}
