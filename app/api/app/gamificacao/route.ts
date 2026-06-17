import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

const CONFIG_DEFAULTS: { acao: string; pontos: number }[] = [
  { acao: "login_diario",       pontos: 10  },
  { acao: "vaga_publicada",     pontos: 50  },
  { acao: "empresa_cadastrada", pontos: 300 },
  { acao: "contrato_criado",    pontos: 100 },
  { acao: "lead_convertido",    pontos: 200 },
  { acao: "documento_assinado", pontos: 75  },
  { acao: "followup_crm",       pontos: 25  },
  { acao: "estudante_aprovado", pontos: 150 },
];

export async function GET() {
  try {
  const session = await getServerSession(authOptions);
  // SEC-M06: autenticação obrigatória — gamificação não é dado público
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fid = session?.user?.franchiseId;

  // Auto-seed configs globais se ainda não existirem
  const existingCount = await prisma.gamificationConfig.count({ where: { franchiseId: null } });
  if (existingCount === 0) {
    await prisma.gamificationConfig.createMany({
      data: CONFIG_DEFAULTS.map(c => ({ ...c, franchiseId: null, ativo: true })),
      skipDuplicates: true,
    });
  } else if (existingCount < CONFIG_DEFAULTS.length) {
    // Garante que todas as ações existam (caso novas ações sejam adicionadas)
    const existing = await prisma.gamificationConfig.findMany({ where: { franchiseId: null }, select: { acao: true } });
    const existingAcoes = new Set(existing.map(e => e.acao));
    const missing = CONFIG_DEFAULTS.filter(c => !existingAcoes.has(c.acao));
    if (missing.length > 0) {
      await prisma.gamificationConfig.createMany({
        data: missing.map(c => ({ ...c, franchiseId: null, ativo: true })),
        skipDuplicates: true,
      });
    }
  }

  const [pontos, configs, allPoints] = await Promise.all([
    prisma.gamificationPoint.findMany({
      where: fid ? { franchiseId: fid } : {},
      orderBy: { createdAt: "desc" }, take: 50,
    }),
    prisma.gamificationConfig.findMany({
      where: { franchiseId: null },
      orderBy: { acao: "asc" },
    }),
    // Ranking: agrupar por franchise
    prisma.gamificationPoint.groupBy({
      by: ["franchiseId"],
      _sum: { pontos: true },
      orderBy: { _sum: { pontos: "desc" } },
    }),
  ]);

  // Buscar nomes das franquias para o ranking
  const fids = allPoints.map(p => p.franchiseId);
  const franchises = await prisma.franchise.findMany({
    where: { id: { in: fids } }, select: { id: true, name: true }
  });
  const fMap = Object.fromEntries(franchises.map(f => [f.id, f.name]));

  const ranking = allPoints.map(p => ({
    franchiseId: p.franchiseId,
    name: fMap[p.franchiseId] || p.franchiseId,
    total: p._sum.pontos || 0,
  }));

  return NextResponse.json({ pontos, configs, ranking });
  } catch (e) {
    return handleApiError(e, "GAMIFICACAO_GET");
  }
}
