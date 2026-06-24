/**
 * GET /api/app/crm/franqueadora
 * Dashboard multi-tenant para FRANQUEADORA.
 * Retorna ranking de unidades por conversão + MRR.
 * Acesso: FRANQUEADORA apenas.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROB: Record<string, number> = {
  novo_lead: 0.05, primeiro_contato: 0.15,
  apresentacao: 0.30, proposta: 0.55,
  negociacao: 0.75, fechado: 1,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Busca todas as franquias ativas
  const franchises = await prisma.franchise.findMany({
    where: { status: "ATIVO" },
    select: { id: true, name: true, cidade: true, uf: true },
    orderBy: { name: "asc" },
  });

  // Busca todos os leads com franchiseId != null (franquias, não franqueadora)
  const leads = await prisma.crmLead.findMany({
    where: { franchiseId: { not: null } },
    select: {
      franchiseId: true, etapa: true, situacao: true,
      valorNegociado: true, convertido: true,
    },
  });

  // Agrupa por franquia
  const byFranchise: Record<string, {
    name: string; cidade: string; uf: string;
    total: number; ativos: number; vendidos: number; perdidos: number;
    mrrPonderado: number; mrrReal: number;
    etapas: Record<string, number>;
  }> = {};

  for (const f of franchises) {
    byFranchise[f.id] = {
      name: f.name, cidade: f.cidade, uf: f.uf,
      total: 0, ativos: 0, vendidos: 0, perdidos: 0,
      mrrPonderado: 0, mrrReal: 0,
      etapas: {},
    };
  }

  for (const l of leads) {
    const fid = l.franchiseId!;
    if (!byFranchise[fid]) continue;
    const d = byFranchise[fid];
    d.total++;
    if (l.situacao === "ativo")   d.ativos++;
    if (l.situacao === "vendido") d.vendidos++;
    if (l.situacao === "perdido") d.perdidos++;
    d.etapas[l.etapa || "novo_lead"] = (d.etapas[l.etapa || "novo_lead"] || 0) + 1;

    const val = l.valorNegociado || 0;
    const prob = PROB[l.etapa || "novo_lead"] ?? 0.05;
    if (l.situacao === "ativo")   d.mrrPonderado += (val * prob) / 12;
    if (l.situacao === "vendido") d.mrrReal      += val / 12;
  }

  const ranking = Object.values(byFranchise)
    .map(d => ({
      ...d,
      taxaConversao: d.total > 0 ? Math.round((d.vendidos / d.total) * 100) : 0,
    }))
    .sort((a, b) => b.taxaConversao - a.taxaConversao || b.total - a.total);

  // Totais globais
  const totalMrrPonderado = ranking.reduce((s, r) => s + r.mrrPonderado, 0);
  const totalMrrReal = ranking.reduce((s, r) => s + r.mrrReal, 0);

  return NextResponse.json({ ranking, totalMrrPonderado, totalMrrReal });
}
