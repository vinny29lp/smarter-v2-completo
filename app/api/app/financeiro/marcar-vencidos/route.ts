/**
 * PATCH /api/app/financeiro/marcar-vencidos
 *
 * Varre todos os lançamentos PENDENTE com vencimentoAt < hoje e os marca como VENCIDO.
 * Chamado automaticamente no carregamento do painel financeiro (fire-and-forget).
 *
 * Escopo:
 *   FRANQUEADORA → todos os registros da rede (franchiseId null + categoria Franquia)
 *   FRANQUEADO/FUNCIONARIO → apenas a própria unidade (franchiseId = sessão)
 *
 * GET → retorna resumo dos atrasados (sem alterar nada)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// ─── GET: resumo dos atrasados ────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role        = session.user.role || "";
    const franchiseId = session.user.franchiseId;
    const isFranqueadora = role === "FRANQUEADORA";

    if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO", "EQUIPE"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: any = isFranqueadora
      ? { OR: [{ franchiseId: null }, { categoria: "Franquia" }] }
      : franchiseId
        ? { franchiseId }
        : {};

    const vencidos = await prisma.financial.findMany({
      where: { ...where, status: "VENCIDO" },
      select: { id: true, tipo: true, valor: true, categoria: true, descricao: true, vencimentoAt: true },
    });

    const isFranquia = (l: any) => l.categoria === "Franquia";

    const atrasadosReceber = vencidos
      .filter(l => isFranqueadora
        ? (l.tipo === "entrada" || isFranquia(l))
        : (l.tipo === "entrada" && !isFranquia(l))
      )
      .reduce((a, b) => a + b.valor, 0);

    const atrasadosPagar = vencidos
      .filter(l => isFranqueadora
        ? (l.tipo === "saida" && !isFranquia(l))
        : (l.tipo === "saida" || isFranquia(l))
      )
      .reduce((a, b) => a + b.valor, 0);

    return NextResponse.json({
      total: vencidos.length,
      atrasadosReceber,
      atrasadosPagar,
      itens: vencidos,
    });
  } catch (e) {
    return handleApiError(e, "MARCAR_VENCIDOS_GET");
  }
}

// ─── PATCH: auto-marca PENDENTE → VENCIDO para itens vencidos ────────────────
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role        = session.user.role || "";
    const franchiseId = session.user.franchiseId;
    const isFranqueadora = role === "FRANQUEADORA";

    if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO", "EQUIPE"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Escopo: quais registros este usuário pode marcar como vencido
    const where: any = isFranqueadora
      ? { OR: [{ franchiseId: null }, { categoria: "Franquia" }] }
      : franchiseId
        ? { franchiseId }
        : {};

    // Marca como VENCIDO todos os PENDENTE com vencimentoAt antes de hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // início do dia de hoje

    const result = await prisma.financial.updateMany({
      where: {
        ...where,
        status: "PENDENTE",
        vencimentoAt: { lt: hoje },
        cancelado: { not: true },
      },
      data: { status: "VENCIDO" },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (e) {
    return handleApiError(e, "MARCAR_VENCIDOS_PATCH");
  }
}
