import { prisma } from "@/lib/prisma";
import { inicioSemana, semaforoSemana, statusMarcos, semaforoGeral, diasEntre, META_CONTRATOS, META_VISITAS_SEMANA, type Semaforo } from "./regras";

export async function metricasUnidade(franchiseId: string, agora = new Date()) {
  const semIni = inicioSemana(agora);
  const f = await prisma.franchise.findUnique({ where: { id: franchiseId }, select: { name: true, createdAt: true, onboardingConcluidoEm: true } });
  const [contratos, visitasSemana, visitasTotal, captadas, contatadas, propostas, empresas, recentes] = await Promise.all([
    prisma.contract.count({ where: { franchiseId, status: "ATIVO" } }),
    prisma.visitaEmpresa.count({ where: { franchiseId, visitadaEm: { gte: semIni } } }),
    prisma.visitaEmpresa.count({ where: { franchiseId } }),
    prisma.crmLead.count({ where: { franchiseId, alizoLeadId: { not: null } } }),
    prisma.crmLead.count({ where: { franchiseId, alizoLeadId: { not: null }, etapa: { not: "novo_lead" } } }),
    prisma.crmLead.count({ where: { franchiseId, etapa: { in: ["proposta", "negociacao", "fechado"] } } }),
    prisma.company.count({ where: { franchiseId } }),
    prisma.visitaEmpresa.findMany({ where: { franchiseId }, orderBy: { visitadaEm: "desc" }, take: 8, select: { id: true, empresa: true, resultado: true, observacao: true, visitadaEm: true } }),
  ]);
  const base = f?.onboardingConcluidoEm ?? f?.createdAt ?? agora;
  const dias = Math.max(0, diasEntre(base, agora));
  const marcos = statusMarcos(dias, contratos);
  const semana = semaforoSemana(visitasSemana, agora);
  return {
    nome: f?.name ?? "", contratos, metaContratos: META_CONTRATOS, visitasSemana, metaVisitas: META_VISITAS_SEMANA, visitasTotal,
    funil: { captadas, contatadas, visitas: visitasTotal, propostas, contratos, empresas },
    diasDeOperacao: dias, marcos, semanaSemaforo: semana, semaforo: semaforoGeral(semana, marcos) as Semaforo, recentes,
  };
}

/** Visão da Matriz: uma linha por unidade ativa + indicadores do funil de venda de franquias. */
export async function painelRede(agora = new Date()) {
  const semIni = inicioSemana(agora);
  const [franquias, contratos, visitas, logins] = await Promise.all([
    prisma.franchise.findMany({ where: { status: "ATIVO" }, select: { id: true, name: true, createdAt: true, onboardingConcluidoEm: true, quizObrigatorio: true, quizAprovadoEm: true } as any }),
    prisma.contract.groupBy({ by: ["franchiseId"], where: { status: "ATIVO" }, _count: { _all: true } }),
    prisma.visitaEmpresa.groupBy({ by: ["franchiseId"], where: { visitadaEm: { gte: semIni } }, _count: { _all: true } }),
    prisma.user.groupBy({ by: ["franchiseId"], where: { role: "FRANQUEADO" }, _max: { lastLoginAt: true } }),
  ]);
  const c = new Map(contratos.map(x => [x.franchiseId, x._count._all]));
  const v = new Map(visitas.map(x => [x.franchiseId, x._count._all]));
  const l = new Map(logins.map(x => [x.franchiseId, x._max.lastLoginAt]));
  const unidades = (franquias as any[]).map(f => {
    const n = c.get(f.id) ?? 0, vs = v.get(f.id) ?? 0;
    const dias = Math.max(0, diasEntre(f.onboardingConcluidoEm ?? f.createdAt, agora));
    const marcos = statusMarcos(dias, n);
    const ultimo = l.get(f.id) ?? null;
    return {
      id: f.id, nome: f.name, contratos: n, visitasSemana: vs, dias,
      semaforo: semaforoGeral(semaforoSemana(vs, agora), marcos) as Semaforo,
      semLogarDias: ultimo ? diasEntre(ultimo, agora) : null,
      treinamentoPendente: !!f.quizObrigatorio && !f.quizAprovadoEm,
    };
  }).sort((a, b) => b.contratos - a.contratos || b.visitasSemana - a.visitasSemana);

  // Funil de venda de franquias (leads → assinatura), por etapa e por origem.
  const leads = await prisma.franquiaLead.findMany({
    where: { leadFrio: false },
    select: { etapa: true, situacao: true, origem: true, createdAt: true, contratoAssinadoEm: true, apresentacaoAbertaEm: true, cofBaixadaEm: true, cadastroEm: true },
  });
  const porEtapa: Record<string, number> = {}; const porOrigem: Record<string, { total: number; fechados: number }> = {};
  let abriuSemAvancar = 0; const temposFechamento: number[] = [];
  for (const x of leads) {
    if (x.situacao !== "perdido") porEtapa[x.etapa] = (porEtapa[x.etapa] ?? 0) + 1;
    const o = x.origem || "sem origem";
    porOrigem[o] ??= { total: 0, fechados: 0 }; porOrigem[o].total++;
    if (x.contratoAssinadoEm || x.situacao === "vendido") { porOrigem[o].fechados++; if (x.contratoAssinadoEm) temposFechamento.push(diasEntre(x.createdAt, x.contratoAssinadoEm)); }
    if ((x.apresentacaoAbertaEm || x.cofBaixadaEm) && !x.cadastroEm && x.situacao === "ativo") abriuSemAvancar++;
  }
  const media = temposFechamento.length ? Math.round(temposFechamento.reduce((a, b) => a + b, 0) / temposFechamento.length) : null;
  return { unidades, funilFranquia: { total: leads.length, porEtapa, porOrigem, abriuSemAvancar, diasMedioAteFechar: media } };
}
