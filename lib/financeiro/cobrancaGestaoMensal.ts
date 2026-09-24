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

  // Cada contrato tem seu próprio try/catch: um erro isolado (dado
  // inconsistente, falha de rede) vira um item com `erro` no resultado, mas
  // NUNCA aborta o lote inteiro — sem isso, um único contrato problemático
  // podia silenciosamente travar a cobrança de todos os outros do mesmo
  // lote (mesma classe de risco corrigida em fechar-mes.ts). O valor
  // cobrado (`c.valorEmpresa`) vem sempre da consulta feita AGORA em
  // prisma.contract.findMany acima — nunca copiado de um lançamento antigo.
  const resultados = await processInBatches(contratos, 10, async (c) => {
    const empresa = c.company?.name || "Empresa";
    try {
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
    } catch (e: any) {
      console.error(`[gerarCobrancasGestaoMensal] Falha no contrato ${c.numero} (${empresa}):`, e?.message || e);
      return { contrato: c.numero, empresa, erro: e?.message || "Erro ao gerar cobrança" };
    }
  });

  const gerados = resultados.filter((r: any) => !r.skipped && !r.erro);
  const comErro = resultados.filter((r: any) => r.erro);
  const totalGeral = gerados.reduce((acc: number, r: any) => acc + (r.valor || 0), 0);

  // Rede de segurança: depois de gerar, confere se sobrou ALGUM contrato
  // ativo (em QUALQUER unidade) sem cobrança desta competência nem da
  // seguinte — cobre tanto os itens com erro acima quanto qualquer contrato
  // que por algum outro motivo nunca tenha passado por aqui (foi assim que
  // o Vinicius encontrou os 5 contratos que nunca tinham sido cobrados).
  const semCobertura = await contratosSemCoberturaGestao();

  if (comErro.length > 0) {
    console.error(`[gerarCobrancasGestaoMensal] ${comErro.length} contrato(s) falharam e NÃO tiveram cobrança gerada:`, comErro.map((r: any) => `${r.contrato} (${r.empresa})`));
  }
  if (semCobertura.length > 0) {
    console.error(`[gerarCobrancasGestaoMensal] ⚠️ ${semCobertura.length} contrato(s) ativo(s) sem NENHUMA cobrança de Taxa de Gestão coberta (mês atual ou seguinte):`, semCobertura.map(s => `${s.numero} (${s.empresa})`));
  }

  return {
    ok: true as const,
    mesRef,
    competencia: comp.chave,
    totalGeral,
    resultados,
    comErro: comErro.length,
    semCobertura,
    message: `Fechamento de Taxa de Gestão de ${mesRef}: ${gerados.length} cobrança(s) gerada(s) para ${contratos.length} contrato(s) ativo(s).`
      + ` Total: R$ ${totalGeral.toFixed(2).replace(".", ",")}`
      + (comErro.length > 0 ? ` — ⚠️ ${comErro.length} falharam.` : "")
      + (semCobertura.length > 0 ? ` — 🚨 ${semCobertura.length} contrato(s) sem cobertura, veja os alertas.` : ""),
  };
}

/**
 * Contratos ATIVO com Taxa de Gestão configurada (valorEmpresa > 0) que NÃO
 * têm nenhum lançamento (categoria "Empresa", não cancelado) com competência
 * do mês atual ou do mês seguinte — ou seja, ficaram pelo menos 1 mês
 * inteiro sem cobrança gerada, em QUALQUER unidade.
 *
 * Usado (a) como rede de segurança logo após o fechamento mensal, e (b)
 * como alerta contínuo (app/api/app/alertas/route.ts) — pra nunca mais um
 * contrato passar batido silenciosamente como os 5 encontrados em
 * 2026-09 (nunca tiveram NENHUM lançamento de Taxa de Gestão, nem o
 * único da época anterior a este fechamento).
 *
 * `franchiseId` escopa a checagem a uma unidade só (usado pelos alertas de
 * FRANQUEADO/FUNCIONARIO); sem ele, verifica a rede inteira (FRANQUEADORA).
 */
export async function contratosSemCoberturaGestao(franchiseId?: string) {
  const hoje = new Date();
  const mesAtual = competenciaDeData(hoje);
  const mesSeguinte = competenciaDoFechamento(hoje).chave;

  const where: any = { status: "ATIVO", valorEmpresa: { gt: 0 } };
  if (franchiseId) where.franchiseId = franchiseId;

  const contratos = await prisma.contract.findMany({
    where,
    select: { id: true, numero: true, valorEmpresa: true, franchiseId: true, company: { select: { name: true } } },
  });
  if (contratos.length === 0) return [];

  const cobertos = await prisma.financial.findMany({
    where: {
      contractId: { in: contratos.map(c => c.id) },
      categoria: "Empresa",
      competencia: { in: [mesAtual, mesSeguinte] },
      cancelado: { not: true },
    },
    select: { contractId: true },
  });
  const cobertosSet = new Set(cobertos.map(c => c.contractId));

  return contratos
    .filter(c => !cobertosSet.has(c.id))
    .map(c => ({
      contractId: c.id,
      numero: c.numero,
      empresa: c.company?.name || "Empresa",
      valor: c.valorEmpresa,
      franchiseId: c.franchiseId,
    }));
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
