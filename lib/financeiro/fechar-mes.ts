/**
 * Lógica de fechamento mensal — extraída para ser reutilizada tanto pela rota
 * autenticada (app/api/app/financeiro/fechar-mes) quanto pelo cron
 * (app/api/cron/fechar-mes).
 *
 * Conceito central: COMPETÊNCIA ("YYYY-MM") — o mês que a cobrança referencia.
 * O fechamento do dia 23 do mês M gera as cobranças de competência M+1,
 * com vencimento no dia configurado da unidade (diaVencimentoTaxa, padrão 10).
 * A deduplicação é por franchiseId + competencia — assim um fechamento forçado
 * fora do dia 23 não bloqueia nem duplica o fechamento seguinte.
 */
import { prisma } from "@/lib/prisma";

// Executa uma função em paralelo com concorrência máxima controlada (batch size)
async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// Competência cobrada pelo fechamento executado em `hoje`: sempre o mês seguinte.
export function competenciaDoFechamento(hoje: Date): { ano: number; mes0: number; chave: string; label: string } {
  const ano = hoje.getFullYear();
  const mes0 = hoje.getMonth() + 1; // mês seguinte (0-based, pode ser 12 → Date normaliza)
  const ref = new Date(ano, mes0, 1);
  const chave = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
  const label = ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { ano: ref.getFullYear(), mes0: ref.getMonth(), chave, label };
}

export async function fecharMes(force: boolean) {
  const hoje = new Date();
  const dia = hoje.getDate();
  if (dia < 23 && !force) {
    return {
      error: `Fechamento disponível apenas no dia 23 ou após. Hoje é dia ${dia}.`,
      status: 400 as const,
    };
  }

  // Competência do mês seguinte (ex.: fechamento em 23/07 → competência 2026-08)
  const comp = competenciaDoFechamento(hoje);
  const mesRef = comp.label;

  // Regra do dia 23: estagiário ativado até o dia 23 → cobrado no fechamento atual
  const dataCorte23 = new Date(hoje.getFullYear(), hoje.getMonth(), 23, 23, 59, 59);

  const franchises = await prisma.franchise.findMany({
    where: { status: "ATIVO" },
    include: {
      contracts: {
        where: {
          status: "ATIVO",
          OR: [
            { ativadoEm: null },                   // contratos antigos sem data (inclui todos por segurança)
            { ativadoEm: { lte: dataCorte23 } },    // ativados até dia 23
          ],
        } as any,
      },
    },
  });

  // Dedup por competência: franqueado que já tem cobrança desta competência é pulado.
  // (Antes era por createdAt no mês corrente — um fechamento forçado no início do mês
  //  fazia o cron do dia 23 pular todo mundo e não gerar o mês seguinte.)
  const jaFechados = await prisma.financial.findMany({
    where: {
      franchiseId: { in: franchises.map(f => f.id) },
      categoria: "Franquia",
      competencia: comp.chave,
      cancelado: { not: true },
    },
    select: { franchiseId: true },
  });
  const jaFechadosSet = new Set(jaFechados.map(j => j.franchiseId));

  // ⚡ ESC-001: Processar em paralelo com batches de 10 (evita timeout de 30s da Vercel)
  const resultados = await processInBatches(franchises, 10, async (f) => {
    const ativos = f.contracts.length;
    const taxaAdmin = ativos * 13;
    const cobrarMens = f.cobrarMensalidade ?? true;
    const mensalidade = cobrarMens ? (f.mensalidade ?? 200) : 0;
    const total = mensalidade + taxaAdmin;

    if (total === 0) {
      return { franchise: f.name, total: 0, skipped: true, reason: "Valor zerado" };
    }

    if (jaFechadosSet.has(f.id)) {
      return { franchise: f.name, total, skipped: true, reason: `Já existe cobrança de ${mesRef}` };
    }

    // Vencimento: dia configurado da unidade (padrão 10) no mês da competência.
    // Clamp 1–28 para nunca estourar o mês (ex.: dia 31 em fevereiro).
    const diaVenc = Math.min(Math.max((f as any).diaVencimentoTaxa ?? 10, 1), 28);
    const vencimento = new Date(Date.UTC(comp.ano, comp.mes0, diaVenc));

    // Monta descrição detalhada: "Sistema R$200 + 3 estag. (R$39) — Unidade X — agosto 2026"
    const partes: string[] = [];
    if (cobrarMens && mensalidade > 0)
      partes.push(`Sistema R$${mensalidade.toFixed(0).replace(".", ",")}`);
    if (ativos > 0)
      partes.push(`${ativos} estag. (R$${taxaAdmin.toFixed(0)})`);
    const descricao = `Taxa de Desenvolvimento — ${partes.join(" + ")} — ${f.name} — ${mesRef}`;

    const lancamento = await prisma.financial.create({
      data: {
        descricao,
        tipo: "entrada",   // Franqueadora vê como A RECEBER; unidade vê como A PAGAR via categoria "Franquia"
        valor: total,
        categoria: "Franquia",
        status: "PENDENTE",
        competencia: comp.chave,
        vencimentoAt: vencimento,
        franchiseId: f.id,
        recorrente: false,
      } as any,
    });

    return {
      franchise: f.name,
      franchiseId: f.id,
      ativos,
      mensalidade,
      taxaAdmin,
      total,
      vencimento: vencimento.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
      lancamentoId: lancamento.id,
    };
  });

  const results = resultados;
  const totalGeral = results
    .filter((r: any) => !r.skipped)
    .reduce((acc: number, r: any) => acc + (r.total || 0), 0);

  return {
    ok: true as const,
    mesRef,
    competencia: comp.chave,
    totalGeral,
    results,
    message: `Fechamento de ${mesRef} realizado para ${results.filter((r: any) => !r.skipped).length} franqueado(s). Total: R$ ${totalGeral.toFixed(2).replace(".", ",")}`,
  };
}

export async function previewFechamento() {
  const hoje = new Date();
  const dataCorte23Preview = new Date(hoje.getFullYear(), hoje.getMonth(), 23, 23, 59, 59);
  const comp = competenciaDoFechamento(hoje);

  const franchises = await prisma.franchise.findMany({
    where: { status: "ATIVO" },
    include: {
      contracts: {
        where: {
          status: "ATIVO",
          OR: [
            { ativadoEm: null },
            { ativadoEm: { lte: dataCorte23Preview } },
          ],
        } as any,
      },
    },
  });

  const preview = franchises.map(f => {
    const ativos = f.contracts.length;
    const taxaAdmin = ativos * 13;
    const mensalidade = (f.cobrarMensalidade ?? true) ? (f.mensalidade ?? 200) : 0;
    const total = mensalidade + taxaAdmin;
    const diaVenc = Math.min(Math.max((f as any).diaVencimentoTaxa ?? 10, 1), 28);
    return {
      franchiseId: f.id,
      nome: f.name,
      ativosCount: ativos,
      taxaAdmin,
      mensalidade,
      cobrarMensalidade: f.cobrarMensalidade ?? true,
      diaVencimento: diaVenc,
      total,
    };
  });

  return {
    preview,
    totalGeral: preview.reduce((a, b) => a + b.total, 0),
    competencia: comp.chave,
    mesRef: comp.label,
  };
}
