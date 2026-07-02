import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/app/marketing/stats — stats gerais sem carregar todos os conteúdos (fix B8)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [totalConteudos, downloadAgg] = await Promise.all([
      prisma.marketingConteudo.count({ where: { ativo: true } }),
      prisma.marketingConteudo.aggregate({
        where: { ativo: true },
        _sum: { totalDownloads: true },
      }),
    ]);

    return NextResponse.json({
      totalConteudos,
      totalDownloads: downloadAgg._sum.totalDownloads || 0,
    });
  } catch (e: any) {
    console.error("[marketing/stats] GET:", e?.message);
    return NextResponse.json({ totalConteudos: 0, totalDownloads: 0 });
  }
}
