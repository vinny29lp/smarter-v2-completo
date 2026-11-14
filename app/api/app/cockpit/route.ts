/**
 * GET /api/app/cockpit — #1 "o que fazer hoje": meta do mês, CRM do dia e o que a Lia fez.
 * PUT /api/app/cockpit — FRANQUEADO define a meta de contratos ativados do mês.
 * Escopo: unidade (FRANQUEADO/FUNCIONARIO) ou rede (FRANQUEADORA/EQUIPE, com ranking por unidade).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { chaveMes, mesesRecentes, contarPorMes } from "@/lib/resultados/agregar";
import { sugerirMeta, progressoMeta, metaValida } from "@/lib/cockpit/metas";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["FRANQUEADO", "FUNCIONARIO", "FRANQUEADORA", "EQUIPE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const master = role === "FRANQUEADORA" || role === "EQUIPE";
  const franchiseId = (session.user as any).franchiseId as string | undefined;
  if (!master && !franchiseId) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  try {
    const agora = new Date();
    const mes = chaveMes(agora);
    const meses4 = mesesRecentes(4, agora); // 3 anteriores + atual
    const desde = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 3, 1));
    const escopo: any = master ? {} : { franchiseId };

    const ativados = await prisma.contract.findMany({
      where: { ...escopo, ativadoEm: { gte: desde } },
      select: { ativadoEm: true, franchiseId: true },
    });

    const inicioDia = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
    const fimDia = new Date(inicioDia.getTime() + 86_400_000);
    const crmWhere = { ...escopo, situacao: "ativo", etapa: { notIn: ["fechado", "perdido"] } };

    if (!master) {
      const [metaReg, retornoHoje, atrasados, novos, feed] = await Promise.all([
        prisma.metaUnidade.findUnique({ where: { franchiseId_mes: { franchiseId: franchiseId!, mes } } }),
        prisma.crmLead.count({ where: { ...crmWhere, retornoAt: { gte: inicioDia, lt: fimDia } } }),
        prisma.crmLead.count({ where: { ...crmWhere, retornoAt: { lt: inicioDia } } }),
        prisma.crmLead.count({ where: { ...crmWhere, etapa: "novo_lead" } }),
        prisma.notification.findMany({
          where: { userId: session.user.id, tipo: "lia_automacao" },
          orderBy: { createdAt: "desc" }, take: 5,
          select: { id: true, mensagem: true, createdAt: true },
        }),
      ]);
      const porMes = contarPorMes(ativados.map(c => c.ativadoEm), meses4);
      const realizado = porMes[porMes.length - 1];
      const sugerida = sugerirMeta(porMes.slice(0, -1));
      return NextResponse.json({
        escopo: "unidade", mes, realizado, historico: porMes.slice(0, -1), mesesHistorico: meses4.slice(0, -1),
        meta: metaReg?.contratos ?? null, sugerida,
        progresso: progressoMeta(metaReg?.contratos ?? sugerida, realizado, agora),
        crm: { retornoHoje, atrasados, novos },
        lia: feed,
      });
    }

    // Rede: ranking por unidade
    const [franquias, metas] = await Promise.all([
      prisma.franchise.findMany({ select: { id: true, name: true } }),
      prisma.metaUnidade.findMany({ where: { mes } }),
    ]);
    const metaPor = new Map(metas.map(m => [m.franchiseId, m.contratos]));
    const unidades = franquias.map(f => {
      const doMes = ativados.filter(c => c.franchiseId === f.id);
      const por = contarPorMes(doMes.map(c => c.ativadoEm), meses4);
      const realizado = por[por.length - 1];
      const meta = metaPor.get(f.id) ?? null;
      return {
        id: f.id, nome: f.name, realizado, meta,
        ritmo: meta ? progressoMeta(meta, realizado, agora).ritmo : null,
        historico: por.slice(0, -1),
      };
    }).sort((a, b) => b.realizado - a.realizado);
    return NextResponse.json({
      escopo: "rede", mes, unidades,
      semMeta: unidades.filter(u => u.meta === null).length,
      atrasadas: unidades.filter(u => u.ritmo === "atrasada").length,
    });
  } catch (e: any) {
    console.error("[cockpit] erro:", e?.message);
    return NextResponse.json({ error: "Erro ao montar o cockpit" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADO") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const franchiseId = (session.user as any).franchiseId as string | undefined;
  if (!franchiseId) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || !metaValida(body.contratos)) {
    return NextResponse.json({ error: "Informe uma meta inteira entre 1 e 500." }, { status: 400 });
  }
  const mes = chaveMes(new Date());
  const meta = await prisma.metaUnidade.upsert({
    where: { franchiseId_mes: { franchiseId, mes } },
    create: { franchiseId, mes, contratos: body.contratos, definidaPor: session.user.id },
    update: { contratos: body.contratos, definidaPor: session.user.id },
  });
  return NextResponse.json({ ok: true, mes, contratos: meta.contratos });
}
