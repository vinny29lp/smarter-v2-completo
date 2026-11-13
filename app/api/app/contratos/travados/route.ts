/**
 * GET /api/app/contratos/travados
 * #15 — Contratos parados em algum ponto do fluxo (sem TCE, sem envio, sem assinatura, sem ativação,
 * ou ativos com data final vencida), com a próxima ação. Escopo: unidade do usuário; rede para master.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";
import { diagnosticarContrato } from "@/lib/contratos/travados";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const permCheck = checkPermission(session, "contratos");
  if (permCheck) return permCheck;

  const role = session.user.role;
  if (!["FRANQUEADORA", "EQUIPE", "FRANQUEADO", "FUNCIONARIO"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const fid = session.user.franchiseId;
  const escopo: any = (role === "FRANQUEADO" || role === "FUNCIONARIO") ? { franchiseId: fid || "__nenhuma__" } : {};

  try {
    const contratos = await prisma.contract.findMany({
      where: { ...escopo, status: { in: ["PENDENTE", "AGUARDANDO_ASSINATURA", "ATIVO"] } },
      select: {
        id: true, numero: true, status: true, createdAt: true, dataFim: true,
        student: { select: { name: true } },
        company: { select: { name: true } },
        franchise: { select: { name: true } },
        documents: { where: { tipo: "tce" }, select: { tipo: true, status: true, signers: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 1500,
    });

    const agora = new Date();
    const itens = contratos
      .map(c => {
        const d = diagnosticarContrato(
          { status: c.status as string | null, createdAt: c.createdAt, dataFim: c.dataFim },
          c.documents.map(x => ({ tipo: x.tipo, status: x.status as string | null, signers: x.signers })),
          agora,
        );
        return d ? {
          id: c.id, numero: c.numero, aluno: c.student?.name, empresa: c.company?.name,
          unidade: c.franchise?.name, ...d,
        } : null;
      })
      .filter(Boolean) as any[];

    itens.sort((a, b) => b.dias - a.dias);
    const porEtapa: Record<string, number> = {};
    for (const i of itens) porEtapa[i.etapa] = (porEtapa[i.etapa] || 0) + 1;

    return NextResponse.json({ total: itens.length, porEtapa, itens: itens.slice(0, 300) });
  } catch (e: any) {
    console.error("[contratos/travados]", e?.message);
    return NextResponse.json({ error: "Erro ao carregar contratos travados" }, { status: 500 });
  }
}
