/**
 * GET /api/app/alertas
 * Central de alertas do dashboard — retorna todos os avisos de ação necessária.
 *
 * Alertas por role:
 *  FRANQUEADO/FUNCIONARIO: contratos vencendo, pendentes, avaliações semestrais, CRM
 *  FRANQUEADORA:           tudo acima + visão de rede + CRM Franquias
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIAS = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86_400_000);
const addDias = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role        = session.user.role;
    const franchiseId = (session.user as any).franchiseId as string | undefined;
    const isMaster    = role === "FRANQUEADORA" || role === "EQUIPE";

    // Filtro base por unidade (FRANQUEADO/FUNCIONARIO vêem só a sua)
    const fwhere = (!isMaster && franchiseId) ? { franchiseId } : {};

    const hoje    = new Date();
    const em30d   = addDias(hoje, 30);
    const ha30d   = addDias(hoje, -30);
    const ha60d   = addDias(hoje, -60);
    const ha6m    = addDias(hoje, -183); // ~6 meses

    // ─── 1. Contratos ATIVO vencendo em até 30 dias ──────────────────────────
    const contratosVencendo = await prisma.contract.findMany({
      where: { ...fwhere, status: "ATIVO", dataFim: { gte: hoje, lte: em30d } },
      select: {
        id: true, numero: true, dataFim: true,
        student: { select: { name: true } },
        company:  { select: { name: true } },
        franchise: { select: { name: true } },
      },
      orderBy: { dataFim: "asc" },
      take: 20,
    });

    // ─── 2. Contratos ATIVO vencidos (dataFim passou, ainda não finalizados) ─
    const contratosVencidosSemFinalizar = await prisma.contract.findMany({
      where: { ...fwhere, status: "ATIVO", dataFim: { lt: hoje } },
      select: {
        id: true, numero: true, dataFim: true,
        student: { select: { name: true } },
        company:  { select: { name: true } },
        franchise: { select: { name: true } },
      },
      orderBy: { dataFim: "asc" },
      take: 20,
    });

    // ─── 3. Contratos PENDENTE/AGUARDANDO_ASSINATURA há 30–60 dias (aviso) ──
    const contratosPendentes1Mes = await prisma.contract.findMany({
      where: {
        ...fwhere,
        status: { in: ["PENDENTE", "AGUARDANDO_ASSINATURA"] },
        createdAt: { gte: ha60d, lt: ha30d },
      },
      select: {
        id: true, numero: true, createdAt: true, status: true,
        student: { select: { name: true } },
        company:  { select: { name: true } },
        franchise: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    // ─── 4. Contratos PENDENTE/AGUARDANDO há +60 dias (crítico — será excluído) ──
    const contratosPendentes2Mes = await prisma.contract.findMany({
      where: {
        ...fwhere,
        status: { in: ["PENDENTE", "AGUARDANDO_ASSINATURA"] },
        createdAt: { lt: ha60d },
      },
      select: {
        id: true, numero: true, createdAt: true, status: true,
        student: { select: { name: true } },
        company:  { select: { name: true } },
        franchise: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    // ─── 5. Avaliação semestral devida (ATIVO há +6 meses) ───────────────────
    const avaliacoesDevidas = await prisma.contract.findMany({
      where: { ...fwhere, status: "ATIVO", dataInicio: { lte: ha6m } },
      select: {
        id: true, numero: true, dataInicio: true,
        student: { select: { name: true } },
        company:  { select: { name: true } },
        franchise: { select: { name: true } },
      },
      orderBy: { dataInicio: "asc" },
      take: 20,
    });

    // ─── 6. CRM de Parcerias — leads com retorno vencido ─────────────────────
    const leadsCrmVencidos = await prisma.crmLead.findMany({
      where: {
        ...fwhere,
        convertido: false,
        retornoAt: { lt: hoje },
        situacao: { not: "perdido" },
      },
      select: { id: true, empresa: true, contato: true, retornoAt: true, etapa: true, franchiseId: true },
      orderBy: { retornoAt: "asc" },
      take: 15,
    });

    // ─── Alertas exclusivos da FRANQUEADORA ──────────────────────────────────
    let unidadesComPendentes2Mes: { franchiseId: string; franchiseName: string; total: number }[] = [];
    let franquiaTarefasVencidas: { id: string; leadId: string; nomeCompleto: string; descricao: string; dueAt: Date }[] = [];
    let franquiaLeadsParados:    { id: string; nomeCompleto: string; etapa: string; ultimoContato: Date | null; dias: number }[] = [];
    let contratosVencidosRede:   number = 0;
    let avaliacoesVencidasRede:  number = 0;

    if (isMaster) {
      // Unidades com contratos pendentes +60 dias (para exclusão manual)
      const pendentes2MesRede = await prisma.contract.groupBy({
        by: ["franchiseId"],
        where: {
          status: { in: ["PENDENTE", "AGUARDANDO_ASSINATURA"] },
          createdAt: { lt: ha60d },
        },
        _count: { id: true },
      });

      if (pendentes2MesRede.length > 0) {
        const franqs = await prisma.franchise.findMany({
          where: { id: { in: pendentes2MesRede.map(p => p.franchiseId) } },
          select: { id: true, name: true },
        });
        const franqMap = Object.fromEntries(franqs.map(f => [f.id, f.name]));
        unidadesComPendentes2Mes = pendentes2MesRede.map(p => ({
          franchiseId: p.franchiseId,
          franchiseName: franqMap[p.franchiseId] || p.franchiseId,
          total: p._count.id,
        }));
      }

      // Totais de rede
      [contratosVencidosRede, avaliacoesVencidasRede] = await Promise.all([
        prisma.contract.count({ where: { status: "ATIVO", dataFim: { lt: hoje } } }),
        prisma.contract.count({ where: { status: "ATIVO", dataInicio: { lte: ha6m } } }),
      ]);

      // CRM Franquias — tarefas vencidas
      const tarefas = await prisma.franquiaTarefa.findMany({
        where: { done: false, dueAt: { lt: hoje } },
        select: {
          id: true, leadId: true, descricao: true, dueAt: true,
          lead: { select: { nomeCompleto: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 15,
      });
      franquiaTarefasVencidas = tarefas.map(t => ({
        id: t.id,
        leadId: t.leadId,
        nomeCompleto: t.lead.nomeCompleto,
        descricao: t.descricao,
        dueAt: t.dueAt!,
      }));

      // CRM Franquias — leads parados (ativos, sem contato há +7 dias)
      const ha7d = addDias(hoje, -7);
      const leadsParados = await prisma.franquiaLead.findMany({
        where: {
          situacao: "ativo",
          etapa: { notIn: ["fechado"] },
          OR: [
            { ultimoContato: { lt: ha7d } },
            { ultimoContato: null },
          ],
        },
        select: { id: true, nomeCompleto: true, etapa: true, ultimoContato: true },
        orderBy: { ultimoContato: "asc" },
        take: 15,
      });
      franquiaLeadsParados = leadsParados.map(l => ({
        id: l.id,
        nomeCompleto: l.nomeCompleto,
        etapa: l.etapa,
        ultimoContato: l.ultimoContato,
        dias: l.ultimoContato ? DIAS(l.ultimoContato) : 999,
      }));
    }

    // ─── Totais por severidade ────────────────────────────────────────────────
    const critico = contratosPendentes2Mes.length + contratosVencidosSemFinalizar.length + unidadesComPendentes2Mes.length + franquiaTarefasVencidas.length;
    const atencao = contratosVencendo.length + contratosPendentes1Mes.length + avaliacoesDevidas.length + leadsCrmVencidos.length;
    const info    = franquiaLeadsParados.length;

    return NextResponse.json({
      alertas: {
        contratosVencendo:           contratosVencendo.map(c => ({ ...c, diasRestantes: Math.ceil((new Date(c.dataFim).getTime() - hoje.getTime()) / 86_400_000) })),
        contratosVencidosSemFinalizar,
        contratosPendentes1Mes:      contratosPendentes1Mes.map(c => ({ ...c, diasPendente: DIAS(new Date(c.createdAt)) })),
        contratosPendentes2Mes:      contratosPendentes2Mes.map(c => ({ ...c, diasPendente: DIAS(new Date(c.createdAt)) })),
        avaliacoesDevidas:           avaliacoesDevidas.map(c => ({ ...c, mesesAtivo: Math.floor(DIAS(new Date(c.dataInicio)) / 30) })),
        leadsCrmVencidos,
        // FRANQUEADORA:
        unidadesComPendentes2Mes,
        franquiaTarefasVencidas,
        franquiaLeadsParados,
        contratosVencidosRede,
        avaliacoesVencidasRede,
      },
      totais: { critico, atencao, info, total: critico + atencao + info },
    });
  } catch (e: any) {
    console.error("[alertas]", e?.message);
    return NextResponse.json({ error: "Erro ao carregar alertas" }, { status: 500 });
  }
}
