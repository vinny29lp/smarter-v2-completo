/**
 * Executa o ciclo de vida das vagas (ver ./ciclo.ts). Roda 1x/dia no cron /api/cron/vagas-ciclo.
 * - PAUSAR: status → PAUSADA (updatedAt renovado = começa a contagem dos 30 dias) + aviso à unidade.
 * - EXCLUIR: copia para a Lixeira (90 dias, restaurável) e remove vaga + candidaturas; remove a vaga espelhada na Alizo (best effort).
 */
import { prisma } from "@/lib/prisma";
import { arquivarVaga } from "@/lib/lixeira";
import { criarAlizoClient } from "@/lib/alizo/client";
import { decidirCicloVaga, DIAS_PARA_PAUSAR, DIAS_PARA_EXCLUIR } from "./ciclo";

const LOTE = 200;

export async function rodarCicloVagas(opts: { dryRun?: boolean; agora?: Date } = {}) {
  const agora = opts.agora ?? new Date();
  const dryRun = !!opts.dryRun;
  const resumo = { dryRun, pausadas: 0, excluidas: 0, erros: 0, amostra: [] as string[] };

  // Só olha vagas já velhas o bastante (o filtro no banco evita varrer todas as vagas todo dia).
  const limiteAberta = new Date(agora.getTime() - DIAS_PARA_PAUSAR * 86_400_000);
  const limitePausada = new Date(agora.getTime() - DIAS_PARA_EXCLUIR * 86_400_000);
  const vagas = await prisma.vacancy.findMany({
    where: {
      OR: [
        { status: "ABERTA", updatedAt: { lte: limiteAberta } },
        { status: "PAUSADA", updatedAt: { lte: limitePausada } },
      ],
    },
    select: { id: true, titulo: true, status: true, updatedAt: true, createdAt: true, franchiseId: true, alizoJobId: true },
    orderBy: { updatedAt: "asc" },
    take: LOTE,
  });
  if (vagas.length === 0) return resumo;

  // Atividade das candidaturas (criada ou movida de etapa) por vaga.
  const atividade = await prisma.application.groupBy({
    by: ["vacancyId"],
    where: { vacancyId: { in: vagas.map(v => v.id) } },
    _max: { createdAt: true, etapaChangedAt: true },
  });
  const ultimaCand = new Map(atividade.map(a => {
    const datas = [a._max.createdAt, a._max.etapaChangedAt].filter((d): d is Date => !!d);
    return [a.vacancyId, datas.length ? new Date(Math.max(...datas.map(d => d.getTime()))) : null] as const;
  }));

  const alizo = criarAlizoClient();

  for (const v of vagas) {
    const acao = decidirCicloVaga({
      status: v.status, atualizadaEm: v.updatedAt, criadaEm: v.createdAt, ultimaCandidaturaEm: ultimaCand.get(v.id) ?? null,
    }, agora);
    if (!acao) continue;
    if (resumo.amostra.length < 10) resumo.amostra.push(`${acao}: ${v.titulo} (${v.id})`);
    if (dryRun) { acao === "PAUSAR" ? resumo.pausadas++ : resumo.excluidas++; continue; }

    try {
      if (acao === "PAUSAR") {
        await prisma.vacancy.update({ where: { id: v.id }, data: { status: "PAUSADA" } });
        await avisarUnidade(v.franchiseId, "⏸️ Vaga pausada por falta de movimento",
          `A vaga "${v.titulo}" ficou ${DIAS_PARA_PAUSAR} dias sem candidatos nem alterações e foi pausada. Reabra em Vagas se ainda precisar dela. Se nada acontecer em mais ${DIAS_PARA_EXCLUIR} dias, ela será excluída (fica 90 dias na Lixeira).`);
        resumo.pausadas++;
      } else {
        await prisma.$transaction(async (tx) => {
          await arquivarVaga(tx, v.id, "sistema:ciclo-vagas");
          await tx.application.deleteMany({ where: { vacancyId: v.id } });
          await tx.vacancy.delete({ where: { id: v.id } });
        }, { timeout: 30_000 });
        if (v.alizoJobId && alizo) await alizo.excluirVaga(v.alizoJobId).catch((e: any) => console.error("[vagas-ciclo] excluir vaga na Alizo falhou:", e?.status, e?.message));
        await avisarUnidade(v.franchiseId, "🗑️ Vaga excluída por inatividade",
          `A vaga "${v.titulo}" ficou ${DIAS_PARA_EXCLUIR} dias pausada sem nenhuma interação e foi excluída. Uma cópia fica na Lixeira por 90 dias e pode ser restaurada pela Franqueadora.`);
        resumo.excluidas++;
      }
    } catch (e: any) {
      resumo.erros++;
      console.error("[vagas-ciclo] falhou:", acao, v.id, e?.message);
    }
  }
  return resumo;
}

async function avisarUnidade(franchiseId: string, titulo: string, mensagem: string) {
  const usuarios = await prisma.user.findMany({ where: { franchiseId, role: "FRANQUEADO", active: true }, select: { id: true } });
  if (usuarios.length === 0) return;
  await prisma.notification.createMany({
    data: usuarios.map(u => ({ userId: u.id, titulo, mensagem, tipo: "vagas_ciclo", link: "/dashboard/vagas" })),
  }).catch(() => {});
}
