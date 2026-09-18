/**
 * cobrancaGestaoMensal.ts — Fechamento mensal da Taxa de Gestão (empresa → unidade).
 *
 * Espelha lib/financeiro/fechar-mes.ts (Taxa de Desenvolvimento, unidade →
 * franqueadora): mesma cadência (fechamento no dia 23 gera a competência do
 * mês seguinte, "YYYY-MM"), mesmo conceito de competência pra deduplicar, e
 * o mesmo corte por status: só entra quem está ATIVO no momento do
 * fechamento — um contrato encerrado/rescindido simplesmente não aparece
 * mais na busca, então para de gerar cobrança sozinho, sem lógica extra.
 *
 * Diferença de escopo: aqui é por CONTRATO (1 estagiário = 1 cobrança), não
 * por franquia — cada contrato ativo com valorEmpresa configurado gera sua
 * própria cobrança de competência, na franquia responsável.
 *
 * ── MIGRAÇÃO DOS CONTRATOS JÁ ATIVOS (2026-09) ──────────────────────────
 * Bug de origem: antes deste fechamento existir, cada contrato tinha NO
 * MÁXIMO 1 lançamento de Taxa de Gestão (categoria "Empresa"), criado uma
 * única vez na ativação do contrato
 * (criarOuAtualizarLancamentoContrato, lib/actions/contracts.ts) e nunca
 * repetido — por isso a cobrança "não continuava" mês a mês.
 *
 * Pra ligar o fechamento recorrente HOJE sem (a) gerar uma enxurrada de
 * cobranças retroativas cobrindo todos os meses "perdidos" de contratos
 * antigos, nem (b) duplicar o lançamento único que cada contrato já tem:
 *
 *  1. backfillCompetenciaGestao() roda UMA VEZ (script manual, não em todo
 *     deploy) e marca a `competencia` do lançamento único já existente de
 *     cada contrato, calculada a partir do mês do `vencimentoAt` dele (ou
 *     `createdAt` se não tiver vencimento). Isso faz o dedup do fechamento
 *     novo enxergar esse lançamento como "já cobri esse mês", evitando
 *     duplicata na primeira vez que o fechamento rodar pra esse contrato.
 *  2. Dali em diante, o fechamento SÓ pergunta "este contrato já tem
 *     lançamento pra ESTA competência (mês seguinte)?" — nunca tenta
 *     reconstruir meses passados que ficaram sem cobrança.
 *
 * Efeito colateral proposital: um contrato ativo há vários meses vai ter um
 * "buraco" entre o lançamento único histórico (ex: julho) e o primeiro
 * gerado pelo fechamento novo (ex: outubro, se o fechamento começar a
 * rodar em setembro) — os meses no meio (agosto, setembro) nunca são
 * cobrados retroativamente pelo sistema. Cobrar esse intervalo é uma
 * decisão de negócio (quanto, se cabe cobrar atrasado de cliente já
 * ativo etc.) que cabe ao Vinicius decidir caso a caso, não algo pra
 * automatizar sem revisão humana.
 */
import { prisma } from "@/lib/prisma";
import { competenciaDoFechamento, processInBatches } from "./fechar-mes";
import { competenciaDeData } from "./competencia";

export { competenciaDeData };

export async function gerarCobrancasGestaoMensal(force: boolean) {
  const hoje = new Date();
  const dia = hoje.getDate();
  if (dia < 23 && !force) {
    return {
      error: `Fechamento disponível apenas no dia 23 ou após. Hoje é dia ${dia}.`,
      status: 400 as const,
    };
  }

  const comp = competenciaDoFechamento(hoje);
  const mesRef = comp.label;

  // Contratos ativos com Taxa de Gestão configurada (valorEmpresa > 0)
  const contratos = await prisma.contract.findMany({
    where: { status: "ATIVO", valorEmpresa: { gt: 0 } },
    include: { company: { select: { name: true } } },
  });

  // Dedup por contractId + competência: contrato que já tem cobrança desta
  // competência é pulado (cobre tanto o backfill do lançamento único quanto
  // um fechamento forçado fora do dia 23 que não deve duplicar o seguinte).
  const jaFechados = await prisma.financial.findMany({
    where: {
      contractId: { in: contratos.map(c => c.id) },
      categoria: "Empresa",
      competencia: comp.chave,
      cancelado: { not: true },
    },
    select: { contractId: true },
  });
  const jaFechadosSet = new Set(jaFechados.map(j => j.contractId));

  const resultados = await processInBatches(contratos, 10, async (c) => {
    const empresa = c.company?.name || "Empresa";

    if (jaFechadosSet.has(c.id)) {
      return { contrato: c.numero, empresa, skipped: true, reason: `Já existe cobrança de ${mesRef}` };
    }

    // Vencimento: dia configurado no contrato (padrão 5), no mês da competência.
    // Clamp 1–28 pra nunca estourar o mês (ex.: dia 31 em fevereiro).
    const diaVenc = Math.min(Math.max(c.vencimento ?? 5, 1), 28);
    const vencimento = new Date(Date.UTC(comp.ano, comp.mes0, diaVenc));
    const descricao = `Taxa de Gestão - ${empresa} - Contrato ${c.numero || "s/n"} - ${mesRef}`;

    const lancamento = await prisma.financial.create({
      data: {
        descricao,
        tipo: "entrada",
        valor: c.valorEmpresa as number,
        categoria: "Empresa",
        status: "PENDENTE",
        competencia: comp.chave,
        vencimentoAt: vencimento,
        franchiseId: c.franchiseId,
        companyId: c.companyId,
        contractId: c.id,
        recorrente: true,
      } as any,
    });

    return {
      contrato: c.numero,
      empresa,
      valor: c.valorEmpresa,
      vencimento: vencimento.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
      lancamentoId: lancamento.id,
    };
  });

  const gerados = resultados.filter((r: any) => !r.skipped);
  const totalGeral = gerados.reduce((acc: number, r: any) => acc + (r.valor || 0), 0);

  return {
    ok: true as const,
    mesRef,
    competencia: comp.chave,
    totalGeral,
    resultados,
    message: `Fechamento de Taxa de Gestão de ${mesRef}: ${gerados.length} cobrança(s) gerada(s) para ${resultados.length} contrato(s) ativo(s). Total: R$ ${totalGeral.toFixed(2).replace(".", ",")}`,
  };
}

export async function previewCobrancaGestao() {
  const hoje = new Date();
  const comp = competenciaDoFechamento(hoje);

  const contratos = await prisma.contract.findMany({
    where: { status: "ATIVO", valorEmpresa: { gt: 0 } },
    include: { company: { select: { name: true } } },
  });

  const jaFechados = await prisma.financial.findMany({
    where: {
      contractId: { in: contratos.map(c => c.id) },
      categoria: "Empresa",
      competencia: comp.chave,
      cancelado: { not: true },
    },
    select: { contractId: true },
  });
  const jaFechadosSet = new Set(jaFechados.map(j => j.contractId));

  const preview = contratos.map(c => ({
    contractId: c.id,
    numero: c.numero,
    empresa: c.company?.name || "Empresa",
    valor: c.valorEmpresa,
    diaVencimento: Math.min(Math.max(c.vencimento ?? 5, 1), 28),
    jaGerado: jaFechadosSet.has(c.id),
  }));

  return {
    preview,
    totalGeral: preview.filter(p => !p.jaGerado).reduce((a, p) => a + (p.valor || 0), 0),
    competencia: comp.chave,
    mesRef: comp.label,
  };
}

/**
 * Migração idempotente (roda uma vez, mas é seguro rodar de novo — só mexe
 * em quem ainda está com `competencia` nula): marca a competência dos
 * lançamentos de Taxa de Gestão (categoria "Empresa") já existentes, a
 * partir do mês do `vencimentoAt` (ou `createdAt` se não houver
 * vencimento) — ver nota de migração no topo do arquivo.
 */
export async function backfillCompetenciaGestao() {
  const semCompetencia = await prisma.financial.findMany({
    where: { categoria: "Empresa", competencia: null, contractId: { not: null } },
    select: { id: true, vencimentoAt: true, createdAt: true },
  });

  let atualizados = 0;
  for (const f of semCompetencia) {
    const base = f.vencimentoAt || f.createdAt || new Date();
    const competencia = competenciaDeData(new Date(base));
    await prisma.financial.update({ where: { id: f.id }, data: { competencia } });
    atualizados++;
  }

  return { encontrados: semCompetencia.length, atualizados };
}
