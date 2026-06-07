/**
 * POST /api/app/financeiro/fechar-mes
 * Calcula e gera cobranças mensais para cada franqueado:
 *   - R$200 mensalidade (se cobrarMensalidade = true)
 *   - R$13 por contrato ATIVO
 * Só disponível no dia 23+ do mês (ou com ?force=true para testes)
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
  // GET: retorna preview do fechamento sem criar registros
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const franchises = await prisma.franchise.findMany({
    where: { status: "ATIVO" },
    include: {
      contracts: { where: { status: "ATIVO" } },
    },
  });

  const preview = franchises.map(f => {
    const ativos = f.contracts.length;
    const taxaAdmin = ativos * 13;
    const mensalidade = (f.cobrarMensalidade ?? true) ? (f.mensalidade ?? 200) : 0;
    const total = mensalidade + taxaAdmin;
    return {
      franchiseId: f.id,
      nome: f.name,
      ativosCount: ativos,
      taxaAdmin,
      mensalidade,
      cobrarMensalidade: f.cobrarMensalidade ?? true,
      total,
    };
  });

  return NextResponse.json({ preview, totalGeral: preview.reduce((a, b) => a + b.total, 0) });
  } catch (e) {
    return handleApiError(e, "FINANCEIRO_FECHAR_GET");
  }
}

export async function POST(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  // Verificar dia 23+
  const hoje = new Date();
  const dia = hoje.getDate();
  if (dia < 23 && !force) {
    return NextResponse.json({
      error: `Fechamento disponível apenas no dia 23 ou após. Hoje é dia ${dia}.`,
    }, { status: 400 });
  }

  // Próximo mês (vencimento dia 5)
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 5);
  const mesRef = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const franchises = await prisma.franchise.findMany({
    where: { status: "ATIVO" },
    include: {
      contracts: { where: { status: "ATIVO" } },
    },
  });

  const results: any[] = [];
  let totalGeral = 0;

  for (const f of franchises) {
    const ativos = f.contracts.length;
    const taxaAdmin = ativos * 13;
    const cobrarMens = f.cobrarMensalidade ?? true;
    const mensalidade = cobrarMens ? (f.mensalidade ?? 200) : 0;
    const total = mensalidade + taxaAdmin;

    if (total === 0) {
      results.push({ franchise: f.name, total: 0, skipped: true, reason: "Valor zerado" });
      continue;
    }

    // Verificar se já foi fechado este mês para este franqueado
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimDia    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const jaExiste = await prisma.financial.findFirst({
      where: {
        franchiseId: f.id,
        categoria: "Franquia",
        createdAt: { gte: inicioDia, lte: fimDia },
      },
    });

    if (jaExiste) {
      results.push({ franchise: f.name, total, skipped: true, reason: "Já fechado este mês" });
      continue;
    }

    // Monta descrição detalhada: "Sistema R$200 + 3 estag. (R$39) — Unidade X — junho 2026"
    const partes: string[] = [];
    if (cobrarMens && mensalidade > 0)
      partes.push(`Sistema R$${mensalidade.toFixed(0).replace(".", ",")}`);
    if (ativos > 0)
      partes.push(`${ativos} estag. (R$${taxaAdmin.toFixed(0)})`);
    const descricao = `${partes.join(" + ")} — ${f.name} — ${mesRef}`;

    const lancamento = await prisma.financial.create({
      data: {
        descricao,
        tipo: "saida",   // A PAGAR para a unidade; a Franqueadora vê como A RECEBER via categoria "Franquia"
        valor: total,
        categoria: "Franquia",
        status: "PENDENTE",
        vencimentoAt: proximoMes,
        franchiseId: f.id,
        recorrente: false,
      } as any,
    });

    results.push({
      franchise: f.name,
      franchiseId: f.id,
      ativos,
      mensalidade,
      taxaAdmin,
      total,
      lancamentoId: lancamento.id,
    });
    totalGeral += total;
  }

  return NextResponse.json({
    ok: true,
    mesRef,
    vencimento: proximoMes.toLocaleDateString("pt-BR"),
    totalGeral,
    results,
    message: `Fechamento realizado para ${results.filter(r => !r.skipped).length} franqueado(s). Total: R$ ${totalGeral.toFixed(2).replace(".", ",")}`,
  });
  } catch (e) {
    return handleApiError(e, "FINANCEIRO_FECHAR_POST");
  }
}
