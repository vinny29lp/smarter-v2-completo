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

export async function GET() {
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
}

export async function POST(req: Request) {
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

    const lancamentos: any[] = [];

    // Entrada 1: Mensalidade (se cobrar)
    if (cobrarMens && mensalidade > 0) {
      const lanc = await prisma.financial.create({
        data: {
          descricao: `Mensalidade — ${f.name} — ${mesRef}`,
          tipo: "entrada",
          valor: mensalidade,
          categoria: "Franquia",
          status: "PENDENTE",
          vencimentoAt: proximoMes,
          franchiseId: f.id,
          recorrente: false,
        } as any,
      });
      lancamentos.push(lanc);
    }

    // Entrada 2: Taxa Admin por estagiários ativos
    if (ativos > 0) {
      const lanc = await prisma.financial.create({
        data: {
          descricao: `Taxa Admin ${ativos} estag. — ${f.name} — ${mesRef}`,
          tipo: "entrada",
          valor: taxaAdmin,
          categoria: "Franquia",
          status: "PENDENTE",
          vencimentoAt: proximoMes,
          franchiseId: f.id,
          recorrente: false,
        } as any,
      });
      lancamentos.push(lanc);
    }

    results.push({
      franchise: f.name,
      franchiseId: f.id,
      ativos,
      mensalidade,
      taxaAdmin,
      total,
      lancamentos: lancamentos.map(l => l.id),
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
}
