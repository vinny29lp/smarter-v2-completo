/**
 * Lógica de fechamento mensal — extraída para ser reutilizada tanto pela rota
 * autenticada (app/api/app/financeiro/fechar-mes) quanto pelo cron
 * (app/api/cron/fechar-mes).
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

export async function fecharMes(force: boolean) {
  const hoje = new Date();
  const dia = hoje.getDate();
  if (dia < 23 && !force) {
    return {
      error: `Fechamento disponível apenas no dia 23 ou após. Hoje é dia ${dia}.`,
      status: 400 as const,
    };
  }

  // Próximo mês (vencimento dia 5)
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 5);
  const mesRef = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

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

  // ⚡ ESC-001: Pré-checar duplicidade em lote (1 query para todos os franqueados)
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimDia    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const jaFechadosNesteMes = await prisma.financial.findMany({
    where: {
      franchiseId: { in: franchises.map(f => f.id) },
      categoria: "Franquia",
      createdAt: { gte: inicioDia, lte: fimDia },
    },
    select: { franchiseId: true },
  });
  const jaFechadosSet = new Set(jaFechadosNesteMes.map(j => j.franchiseId));

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
      return { franchise: f.name, total, skipped: true, reason: "Já fechado este mês" };
    }

    // Monta descrição detalhada: "Sistema R$200 + 3 estag. (R$39) — Unidade X — junho 2026"
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
        vencimentoAt: proximoMes,
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
    vencimento: proximoMes.toLocaleDateString("pt-BR"),
    totalGeral,
    results,
    message: `Fechamento realizado para ${results.filter((r: any) => !r.skipped).length} franqueado(s). Total: R$ ${totalGeral.toFixed(2).replace(".", ",")}`,
  };
}

export async function previewFechamento() {
  const hoje = new Date();
  const dataCorte23Preview = new Date(hoje.getFullYear(), hoje.getMonth(), 23, 23, 59, 59);

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
    return {
      franchiseId: f.id,
      nome: f.name,
      ativosCount: ativos,
      taxaAdmin,
      mensalidade,
      cobrarMensalidade: f.cobrarMensalidade ?? true,
      total,
    };
  });

  return { preview, totalGeral: preview.reduce((a, b) => a + b.total, 0) };
}
