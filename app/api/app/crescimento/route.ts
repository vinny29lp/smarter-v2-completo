import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// ─── Relatório de Crescimento da Rede (FRANQUEADORA) ───────────────────────────
// Agregação de cadastros (estudantes, empresas, IES, contratos ativos, franquias)
// e financeiro por período selecionável, com quebra por unidade e por origem.
// Toda a contagem/soma é feita no banco (count/groupBy/raw SQL agregado) — nunca
// carrega a lista completa de registros em memória.

type Granularidade = "day" | "week" | "month";

function truncUTC(d: Date, g: Granularidade): Date {
  if (g === "day") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (g === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diffToMonday));
}

function nextBucket(d: Date, g: Granularidade): Date {
  if (g === "day") return new Date(d.getTime() + 86400000);
  if (g === "week") return new Date(d.getTime() + 7 * 86400000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

function generateBuckets(from: Date, to: Date, g: Granularidade): Date[] {
  const buckets: Date[] = [];
  let cur = truncUTC(from, g);
  const end = truncUTC(to, g);
  let guard = 0;
  while (cur.getTime() <= end.getTime() && guard < 400) {
    buckets.push(new Date(cur));
    cur = nextBucket(cur, g);
    guard++;
  }
  return buckets;
}

function granularidadeFor(from: Date, to: Date): Granularidade {
  const dias = (to.getTime() - from.getTime()) / 86400000;
  if (dias <= 31) return "day";
  if (dias <= 180) return "week";
  return "month";
}

function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null; // null = "novo" (sem base de comparação)
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

async function seriePorTabela(
  tableSql: string,
  dateColSql: string,
  extraWhereSql: string,
  from: Date,
  to: Date,
  granularidade: Granularidade
) {
  const rows = await prisma.$queryRaw<{ bucket: Date; count: bigint }[]>`
    SELECT date_trunc(${granularidade}, ${Prisma.raw(dateColSql)}) as bucket, count(*)::bigint as count
    FROM ${Prisma.raw(tableSql)}
    WHERE ${Prisma.raw(dateColSql)} BETWEEN ${from} AND ${to} ${Prisma.raw(extraWhereSql)}
    GROUP BY bucket
    ORDER BY bucket
  `;
  const map = new Map<number, number>();
  for (const r of rows) map.set(new Date(r.bucket).getTime(), Number(r.count));
  return generateBuckets(from, to, granularidade).map(b => ({
    bucket: b.toISOString(),
    count: map.get(b.getTime()) || 0,
  }));
}

async function somaPorTabela(
  tableSql: string,
  dateColSql: string,
  valorColSql: string,
  extraWhereSql: string,
  from: Date,
  to: Date,
  granularidade: Granularidade
) {
  const rows = await prisma.$queryRaw<{ bucket: Date; total: number }[]>`
    SELECT date_trunc(${granularidade}, ${Prisma.raw(dateColSql)}) as bucket, COALESCE(SUM(${Prisma.raw(valorColSql)}), 0)::float as total
    FROM ${Prisma.raw(tableSql)}
    WHERE ${Prisma.raw(dateColSql)} BETWEEN ${from} AND ${to} ${Prisma.raw(extraWhereSql)}
    GROUP BY bucket
    ORDER BY bucket
  `;
  const map = new Map<number, number>();
  for (const r of rows) map.set(new Date(r.bucket).getTime(), Number(r.total));
  return generateBuckets(from, to, granularidade).map(b => ({
    bucket: b.toISOString(),
    total: map.get(b.getTime()) || 0,
  }));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso restrito à FRANQUEADORA." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - 30 * 86400000);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json({ error: "Período inválido." }, { status: 400 });
    }
    // Limita a janela a 5 anos para evitar consultas desproporcionais
    const maxRangeMs = 5 * 365 * 86400000;
    if (to.getTime() - from.getTime() > maxRangeMs) {
      return NextResponse.json({ error: "Período máximo permitido é de 5 anos." }, { status: 400 });
    }
    to.setUTCHours(23, 59, 59, 999);
    from.setUTCHours(0, 0, 0, 0);

    const granularidade = granularidadeFor(from, to);
    const duracaoMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - duracaoMs);

    // ── Contagens atual × anterior (agregação no banco) ──────────────────────
    const [
      estudantesAtual, estudantesAnterior,
      empresasAtual, empresasAnterior,
      iesAtual, iesAnterior,
      contratosAtual, contratosAnterior,
      franquiasNovasAtual, franquiasNovasAnterior,
      franquiasAtivasHoje,
    ] = await Promise.all([
      prisma.student.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.student.count({ where: { createdAt: { gte: previousFrom, lte: previousTo } } }),
      prisma.company.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.company.count({ where: { createdAt: { gte: previousFrom, lte: previousTo } } }),
      prisma.institution.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.institution.count({ where: { createdAt: { gte: previousFrom, lte: previousTo } } }),
      prisma.contract.count({
        where: {
          status: "ATIVO",
          OR: [
            { ativadoEm: { gte: from, lte: to } },
            { AND: [{ ativadoEm: null }, { createdAt: { gte: from, lte: to } }] },
          ],
        },
      }),
      prisma.contract.count({
        where: {
          status: "ATIVO",
          OR: [
            { ativadoEm: { gte: previousFrom, lte: previousTo } },
            { AND: [{ ativadoEm: null }, { createdAt: { gte: previousFrom, lte: previousTo } }] },
          ],
        },
      }),
      prisma.franchise.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.franchise.count({ where: { createdAt: { gte: previousFrom, lte: previousTo } } }),
      prisma.franchise.count({ where: { status: "ATIVO" } }),
    ]);

    // ── Financeiro (receita da rede: entradas + cobranças de Franquia pagas) ──
    const receitaWhereBase = { status: "PAGO" as const, cancelado: { not: true }, OR: [{ tipo: "entrada" }, { categoria: "Franquia" }] };
    const [receitaAtualAgg, receitaAnteriorAgg] = await Promise.all([
      prisma.financial.aggregate({ _sum: { valor: true }, where: { ...receitaWhereBase, paidAt: { gte: from, lte: to } } }),
      prisma.financial.aggregate({ _sum: { valor: true }, where: { ...receitaWhereBase, paidAt: { gte: previousFrom, lte: previousTo } } }),
    ]);
    const receitaAtual = receitaAtualAgg._sum.valor || 0;
    const receitaAnterior = receitaAnteriorAgg._sum.valor || 0;

    // ── Séries temporais (bucketizadas no banco via date_trunc) ──────────────
    const [
      serieEstudantes, serieEmpresas, serieIes, serieContratos, serieFranquias, serieFinanceiro,
    ] = await Promise.all([
      seriePorTabela("students", `"createdAt"`, "", from, to, granularidade),
      seriePorTabela("companies", `"createdAt"`, "", from, to, granularidade),
      seriePorTabela("institutions", `"createdAt"`, "", from, to, granularidade),
      seriePorTabela("contracts", `COALESCE("ativadoEm","createdAt")`, `AND status::text = 'ATIVO'`, from, to, granularidade),
      seriePorTabela("franchises", `"createdAt"`, "", from, to, granularidade),
      somaPorTabela("financials", `"paidAt"`, `"valor"`, `AND status::text = 'PAGO' AND (cancelado IS NOT TRUE) AND (tipo = 'entrada' OR categoria = 'Franquia')`, from, to, granularidade),
    ]);

    // ── Quebra por unidade (franqueada) ───────────────────────────────────────
    const franquias = await prisma.franchise.findMany({ select: { id: true, name: true } });
    const nomeFranquia = new Map(franquias.map(f => [f.id, f.name]));

    const [porUnidadeEstudantes, porUnidadeEmpresas, porUnidadeIes, porUnidadeContratos] = await Promise.all([
      prisma.student.groupBy({ by: ["franchiseId"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
      prisma.company.groupBy({ by: ["franchiseId"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
      prisma.institution.groupBy({ by: ["franchiseId"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
      prisma.contract.groupBy({
        by: ["franchiseId"],
        where: {
          status: "ATIVO",
          OR: [
            { ativadoEm: { gte: from, lte: to } },
            { AND: [{ ativadoEm: null }, { createdAt: { gte: from, lte: to } }] },
          ],
        },
        _count: { _all: true },
      }),
    ]);

    const mapUnidade = (rows: { franchiseId: string | null; _count: { _all: number } }[]) =>
      rows
        .map(r => ({
          franchiseId: r.franchiseId,
          nome: r.franchiseId ? nomeFranquia.get(r.franchiseId) || "Unidade removida" : "Sem unidade",
          count: r._count._all,
        }))
        .sort((a, b) => b.count - a.count);

    // ── Quebra por origem (NORMAL × MIGRADO) — Empresas, IES, Contratos ──────
    const [porOrigemEmpresas, porOrigemIes, porOrigemContratos] = await Promise.all([
      prisma.company.groupBy({ by: ["origem"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
      prisma.institution.groupBy({ by: ["origem"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
      prisma.contract.groupBy({
        by: ["origem"],
        where: {
          status: "ATIVO",
          OR: [
            { ativadoEm: { gte: from, lte: to } },
            { AND: [{ ativadoEm: null }, { createdAt: { gte: from, lte: to } }] },
          ],
        },
        _count: { _all: true },
      }),
    ]);
    const mapOrigem = (rows: { origem: string | null; _count: { _all: number } }[]) =>
      rows.map(r => ({ origem: r.origem || "NORMAL", count: r._count._all })).sort((a, b) => b.count - a.count);

    // ── Canal de aquisição de leads de novas franquias (dado real disponível) ─
    const porCanalFranquiaLead = await prisma.franquiaLead.groupBy({
      by: ["origem"],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    });

    return NextResponse.json({
      periodo: { from: from.toISOString(), to: to.toISOString(), granularidade },
      resumo: {
        estudantes: { atual: estudantesAtual, anterior: estudantesAnterior, variacaoPct: variacaoPct(estudantesAtual, estudantesAnterior) },
        empresas: { atual: empresasAtual, anterior: empresasAnterior, variacaoPct: variacaoPct(empresasAtual, empresasAnterior) },
        ies: { atual: iesAtual, anterior: iesAnterior, variacaoPct: variacaoPct(iesAtual, iesAnterior) },
        contratosAtivos: { atual: contratosAtual, anterior: contratosAnterior, variacaoPct: variacaoPct(contratosAtual, contratosAnterior) },
        franquias: {
          novasNoPeriodo: franquiasNovasAtual,
          novasAnterior: franquiasNovasAnterior,
          variacaoPct: variacaoPct(franquiasNovasAtual, franquiasNovasAnterior),
          ativasHoje: franquiasAtivasHoje,
        },
        financeiro: { atual: receitaAtual, anterior: receitaAnterior, variacaoPct: variacaoPct(receitaAtual, receitaAnterior) },
      },
      series: {
        estudantes: serieEstudantes,
        empresas: serieEmpresas,
        ies: serieIes,
        contratosAtivos: serieContratos,
        franquias: serieFranquias,
        financeiro: serieFinanceiro,
      },
      porUnidade: {
        estudantes: mapUnidade(porUnidadeEstudantes),
        empresas: mapUnidade(porUnidadeEmpresas),
        ies: mapUnidade(porUnidadeIes),
        contratosAtivos: mapUnidade(porUnidadeContratos),
      },
      porOrigem: {
        empresas: mapOrigem(porOrigemEmpresas),
        ies: mapOrigem(porOrigemIes),
        contratosAtivos: mapOrigem(porOrigemContratos),
      },
      franquiaLeadsCanal: porCanalFranquiaLead
        .map(r => ({ canal: r.origem || "não informado", count: r._count._all }))
        .sort((a, b) => b.count - a.count),
      lacunas: {
        canalMarketing:
          "Estudantes, Empresas, IES e Contratos não possuem campo de canal de marketing (ex.: site oficial, Instagram, indicação) no cadastro atual — apenas a unidade responsável é registrada, e Empresas/IES/Contratos têm um campo de origem que distingue apenas NORMAL × MIGRADO (dados trazidos do sistema antigo). O único lugar do sistema com canal de aquisição real hoje é o funil de leads de novas franquias (FranquiaLead: meta_ads, indicação, orgânico, evento, outro), mostrado na seção de Franquias abaixo.",
      },
    });
  } catch (e) {
    return handleApiError(e, "CRESCIMENTO_GET");
  }
}
