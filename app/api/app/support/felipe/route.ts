/**
 * GET /api/app/support/felipe — FRANQUEADORA logada.
 * Lista os chamados de suporte com o acompanhamento do Felipe (TI), do mais recente ao mais antigo.
 */
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classificarRisco, STATUS_VALIDOS } from "@/lib/support/felipe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status") ?? "";
  const where = (STATUS_VALIDOS as string[]).includes(status) ? { felipeStatus: status } : {};
  const casos = await prisma.supportCase.findMany({
    where, orderBy: { createdAt: "desc" }, take: 100,
    select: {
      id: true, protocol: true, title: true, description: true, path: true, category: true, reporterName: true,
      franchiseId: true, remoteStatus: true, createdAt: true, felipeStatus: true, felipeRisk: true,
      felipeDiagnosis: true, felipeProposal: true, felipeChangeUrl: true, felipeNotes: true, felipeDecidedAt: true,
    },
  });
  return NextResponse.json({
    casos: casos.map((c) => ({
      ...c,
      felipeRisk: c.felipeRisk ?? classificarRisco({ category: c.category, title: c.title, description: c.description, path: c.path }),
    })),
  });
}
