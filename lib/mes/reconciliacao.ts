/**
 * reconciliacao.ts — Filtro de quais lançamentos entram na etapa "financeiro"
 * do fechamento de mês (/dashboard/mes/fechar, passo 2).
 *
 * Bug de produção (04/08/2026): a rota aceita fechar meses PASSADOS pendentes
 * (fix do mes-gate, commit 08babd8), mas a lista de reconciliação buscava
 * TODOS os lançamentos PENDENTE/VENCIDO da unidade sem nenhum filtro de mês.
 * Resultado: unidades fechando um mês atrasado (ex.: julho, já em agosto)
 * viam cobranças do mês seguinte (agosto) já geradas, sem nenhuma relação
 * com o mês sendo fechado — travava o fechamento pedindo decisão sobre
 * contas que nem venceram ainda.
 *
 * Regra: mostra o que venceu no mês sendo fechado OU antes dele (atrasados
 * ainda não resolvidos de meses anteriores também precisam ser reconciliados
 * aqui). Nunca mostra o que vence DEPOIS do mês sendo fechado.
 */

export interface LancamentoReconciliavel {
  status: string;
  cancelado?: boolean | null;
  vencimentoAt?: string | Date | null;
  createdAt?: string | Date | null;
}

function mesKeyDe(l: LancamentoReconciliavel): number | null {
  if (l.vencimentoAt) {
    const d = new Date(l.vencimentoAt);
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
  }
  if (l.createdAt) {
    const d = new Date(l.createdAt);
    return d.getFullYear() * 12 + d.getMonth();
  }
  return null;
}

export function filtrarLancamentosParaReconciliacao<T extends LancamentoReconciliavel>(
  lancamentos: T[],
  mes: number,
  ano: number
): T[] {
  const alvoKey = ano * 12 + (mes - 1);
  return lancamentos.filter(l => {
    if (l.cancelado) return false;
    if (l.status !== "PENDENTE" && l.status !== "VENCIDO") return false;
    const key = mesKeyDe(l);
    return key === null || key <= alvoKey;
  });
}
