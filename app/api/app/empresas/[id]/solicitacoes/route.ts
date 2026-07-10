import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  // SEC: escopo por franquia — unidade só vê solicitações de empresa da própria franquia.
  const role = session.user.role || "";
  if (role !== "FRANQUEADORA") {
    const empresa = await prisma.company.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!empresa || empresa.franchiseId !== session.user.franchiseId) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }
  }

  const solicitacoes = await (prisma as any).vagaSolicitacao.findMany({
    where: { companyId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ solicitacoes });
}
