/** GET /api/app/lixeira — #27: itens excluídos nos últimos 90 dias (somente FRANQUEADORA). */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const itens = await prisma.lixeira.findMany({
    where: { restauradoEm: null, expiraEm: { gte: new Date() } },
    orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, entidade: true, nome: true, franchiseId: true, createdAt: true, expiraEm: true, excluidoPor: true },
  });
  return NextResponse.json({ itens });
}
