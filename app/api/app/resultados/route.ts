/**
 * GET /api/app/resultados
 * #22 — Painel de resultados: contratos ativos, entradas por mês, tempo de ativação e
 * #18 — relatório de saídas por motivo de rescisão. Escopo: unidade (FRANQUEADO) ou rede (master).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { mesesRecentes, contarPorMes, mediaDias, variacaoPct } from "@/lib/resultados/agregar";
import { rotuloMotivo, grupoMotivo } from "@/lib/contratos/motivoRescisao";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["FRANQUEADO", "FRANQUEADORA", "EQUIPE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const escopo: any = role === "FRANQUEADO" ? { franchiseId: session.user.franchiseId || "__nenhuma__" } : {};

  try {
    const agora = new Date();
    const meses = mesesRecentes(6, agora);
    const desde = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 5, 1));
    const desde12 = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 11, 1));

    const [ativos, recentes, pendentes, docsRescisao] = await Promise.all([
      prisma.contract.findMany({
        where: { ...escopo, status: "ATIVO" },
        select: { companyId: true, studentId: true },
      }),
      prisma.contract.findMany({
        where: { ...escopo, OR: [{ createdAt: { gte: desde } }, { ativadoEm: { gte: desde } }] },
        select: { createdAt: true, ativadoEm: true },
      }),
      prisma.contract.count({ where: { ...escopo, status: { in: ["PENDENTE", "AGUARDANDO_ASSINATURA"] } } }),
      prisma.internshipDocument.findMany({
        where: {
          tipo: { in: ["tr", "rr"] },
          status: { not: "NAO_GERADO" },
          updatedAt: { gte: desde12 },
          contract: escopo,
        },
        select: { contractId: true, metaData: true, tipo: true },
      }),
    ]);

    const criados = contarPorMes(recentes.map(c => c.createdAt), meses);
    const ativados = contarPorMes(recentes.map(c => c.ativadoEm), meses);
    const n = meses.length;

    // Saídas: 1 por contrato (TR e RR do mesmo contrato não contam duas vezes); prefere o doc que traz o motivo.
    const porContrato = new Map<string, string | null>();
    for (const d of docsRescisao) {
      const cat = (d.metaData as any)?.motivoCategoria || null;
      if (!porContrato.has(d.contractId) || (cat && !porContrato.get(d.contractId))) porContrato.set(d.contractId, cat);
    }
    const saidas: Record<string, { rotulo: string; grupo: string; qtd: number }> = {};
    for (const cat of Array.from(porContrato.values())) {
      const k = cat || "NAO_INFORMADO";
      saidas[k] = saidas[k] || { rotulo: rotuloMotivo(cat), grupo: grupoMotivo(cat), qtd: 0 };
      saidas[k].qtd++;
    }

    return NextResponse.json({
      escopo: role === "FRANQUEADO" ? "unidade" : "rede",
      ativos: {
        contratos: ativos.length,
        empresas: new Set(ativos.map(a => a.companyId)).size,
        estudantes: new Set(ativos.map(a => a.studentId)).size,
      },
      pendentes,
      meses, criados, ativados,
      novosMes: criados[n - 1], novosMesAnterior: criados[n - 2],
      variacaoNovos: variacaoPct(criados[n - 1], criados[n - 2]),
      diasParaAtivar: mediaDias(recentes.map(c => ({ de: c.createdAt, ate: c.ativadoEm }))),
      saidas: Object.values(saidas).sort((a, b) => b.qtd - a.qtd),
      totalSaidas12m: porContrato.size,
    });
  } catch (e: any) {
    console.error("[resultados]", e?.message);
    return NextResponse.json({ error: "Erro ao carregar resultados" }, { status: 500 });
  }
}
