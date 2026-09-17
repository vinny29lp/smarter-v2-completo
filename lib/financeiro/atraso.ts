/**
 * atraso.ts — Regra única de "este lançamento está atrasado?" para o
 * módulo financeiro.
 *
 * Bug real encontrado em produção (09/2026): um lançamento ficava com
 * status VENCIDO mesmo depois do vencimento ser adiado pra uma data
 * futura, porque a rota de edição só grava `vencimentoAt` sem reavaliar o
 * `status` — o lançamento ficava "atrasado" pra sempre. Além disso, o
 * mesmo tipo de comparação de data estava duplicado (e levemente
 * divergente) em pelo menos 3 lugares: a rota que marca vencidos em lote
 * (comparava por instante local do servidor, via `hoje.setHours(0,0,0,0)`
 * — depende do fuso do processo, não é garantidamente UTC), o painel
 * (comparava por MÊS, não por dia) e duas tabelas de preview (comparavam
 * por instante exato `new Date() `, o que marca "vencido" já na METADE do
 * próprio dia de vencimento, já que `vencimentoAt` é gravado ao meio-dia
 * UTC por algumas rotas).
 *
 * Este módulo é a única fonte de verdade: compara sempre por
 * dia-calendário em UTC (nunca hora exata, nunca fuso local do processo).
 */

const MS_DIA = 24 * 60 * 60 * 1000;

function chaveDataUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Início do dia (UTC) de `data` — para usar em comparações `{ lt: ... }` do Prisma. */
export function inicioDoDiaUTC(data: Date = new Date()): Date {
  return new Date(chaveDataUTC(data));
}

/**
 * true se `vencimentoAt` já passou, comparando o dia-calendário UTC (não a
 * hora exata) — um lançamento só está atrasado a partir do dia SEGUINTE ao
 * vencimento, nunca durante o próprio dia de vencimento.
 */
export function estaVencido(vencimentoAt: Date | string | null | undefined, referencia: Date = new Date()): boolean {
  if (!vencimentoAt) return false;
  const venc = typeof vencimentoAt === "string" ? new Date(vencimentoAt) : vencimentoAt;
  if (isNaN(venc.getTime())) return false;
  return chaveDataUTC(venc) < chaveDataUTC(referencia);
}

/**
 * Dias corridos (inteiro, nunca negativo) desde o vencimento — 0 quando
 * ainda não venceu (ou nunca teve vencimento). Bug real encontrado em
 * produção: a tela calculava isso com `Date.now() - vencimentoAt` direto,
 * sem checar o sinal — um lançamento com vencimento no futuro (por causa do
 * bug do status preso, ver acima) chegava a mostrar "Venceu há -3 dia(s)",
 * um número negativo de dias vencidos, logicamente impossível.
 */
export function diasEmAtraso(vencimentoAt: Date | string | null | undefined, referencia: Date = new Date()): number {
  if (!estaVencido(vencimentoAt, referencia)) return 0;
  const venc = typeof vencimentoAt === "string" ? new Date(vencimentoAt) : (vencimentoAt as Date);
  return Math.round((chaveDataUTC(referencia) - chaveDataUTC(venc)) / MS_DIA);
}

export type StatusFinanceiro = "PENDENTE" | "PAGO" | "VENCIDO" | "CANCELADO";

/**
 * Dado o status atual de um lançamento e sua nova data de vencimento (ex:
 * acabou de ser editada), devolve o status para o qual ele deveria ir —
 * ou `null` se o status atual já está correto (evita um update
 * desnecessário).
 *
 * Só reavalia PENDENTE/VENCIDO — PAGO e CANCELADO são estados finais que
 * uma edição de data não deve alterar.
 */
export function statusAposEditarVencimento(
  statusAtual: string,
  novoVencimento: Date | string | null | undefined,
  referencia: Date = new Date()
): "PENDENTE" | "VENCIDO" | null {
  if (statusAtual !== "PENDENTE" && statusAtual !== "VENCIDO") return null;
  const esperado: "PENDENTE" | "VENCIDO" = estaVencido(novoVencimento, referencia) ? "VENCIDO" : "PENDENTE";
  return esperado !== statusAtual ? esperado : null;
}
