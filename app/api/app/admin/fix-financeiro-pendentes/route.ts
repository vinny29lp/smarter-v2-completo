/**
 * POST /api/app/admin/fix-financeiro-pendentes
 *
 * Corrige dados históricos: cancela lançamentos financeiros vinculados a
 * contratos que ainda estão PENDENTE ou AGUARDANDO_ASSINATURA.
 *
 * Regra: cobrança só é gerada quando o contrato fica ATIVO.
 * Exclusivo FRANQUEADORA.
 *
 * GET  → preview (não altera nada)
 * POST → executa a correção
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getLancamentosIndevidos() {
  return prisma.financial.findMany({
    where: {
      cancelado: false,
      status: "PENDENTE",
      contract: {
        status: { in: ["PENDENTE", "AGUARDANDO_ASSINATURA"] },
      },
    },
    select: {
      id: true, descricao: true, valor: true, categoria: true, createdAt: true,
      contract: { select: { id: true, numero: true, status: true, franchiseId: true,
        franchise: { select: { name: true } },
        student: { select: { name: true } },
        company: { select: { name: true } },
      }},
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const lancamentos = await getLancamentosIndevidos();

  return NextResponse.json({
    preview: true,
    total: lancamentos.length,
    totalValor: lancamentos.reduce((s, l) => s + (l.valor || 0), 0),
    lancamentos: lancamentos.map(l => ({
      id: l.id,
      descricao: l.descricao,
      valor: l.valor,
      categoria: l.categoria,
      contrato: l.contract?.numero,
      statusContrato: l.contract?.status,
      estudante: l.contract?.student?.name,
      empresa: l.contract?.company?.name,
      unidade: l.contract?.franchise?.name,
      criadoEm: l.createdAt,
    })),
    mensagem: lancamentos.length > 0
      ? `${lancamentos.length} lançamento(s) serão cancelados ao confirmar.`
      : "Nenhum lançamento indevido encontrado. Base de dados está correta.",
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const lancamentos = await getLancamentosIndevidos();

  if (lancamentos.length === 0) {
    return NextResponse.json({
      ok: true,
      cancelados: 0,
      mensagem: "Nenhum lançamento indevido encontrado. Base de dados já está correta.",
    });
  }

  // Cancelar todos em uma única operação
  const ids = lancamentos.map(l => l.id);
  await prisma.financial.updateMany({
    where: { id: { in: ids } },
    data: { cancelado: true },
  });

  // Atualizar descrições individualmente para manter rastreabilidade
  await Promise.all(
    lancamentos.map(l =>
      prisma.financial.update({
        where: { id: l.id },
        data: { descricao: l.descricao + " [CANCELADO — contrato ainda pendente]" },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    cancelados: lancamentos.length,
    totalValorRemovido: lancamentos.reduce((s, l) => s + (l.valor || 0), 0),
    mensagem: `${lancamentos.length} lançamento(s) financeiros cancelados com sucesso. O financeiro agora reflete apenas contratos ATIVOS.`,
    detalhes: lancamentos.map(l => ({
      contrato: l.contract?.numero,
      estudante: l.contract?.student?.name,
      empresa: l.contract?.company?.name,
      unidade: l.contract?.franchise?.name,
      valor: l.valor,
    })),
  });
}
