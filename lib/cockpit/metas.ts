/** #1 — Cockpit "o que fazer hoje": lógica pura de metas mensais (sem "@/", testável no vitest). */

/** Sugestão de meta: média dos últimos meses completos +10%, no mínimo 1 (ou o mês anterior se não houver histórico). */
export function sugerirMeta(historico: number[]): number {
  const h = historico.filter(n => Number.isFinite(n) && n >= 0);
  if (h.length === 0) return 3;
  const media = h.reduce((s, n) => s + n, 0) / h.length;
  return Math.max(1, Math.ceil(media * 1.1));
}

export type Ritmo = "batida" | "no_ritmo" | "atrasada";

export interface ProgressoMeta {
  meta: number;
  realizado: number;
  pct: number;          // 0..100 (limitado a 100)
  falta: number;
  diasRestantes: number;
  porSemana: number;    // quantos por semana ainda são necessários
  ritmo: Ritmo;
}

export function progressoMeta(meta: number, realizado: number, agora = new Date()): ProgressoMeta {
  const m = Math.max(0, Math.floor(meta));
  const r = Math.max(0, Math.floor(realizado));
  const diasNoMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 0)).getUTCDate();
  const diaAtual = agora.getUTCDate();
  const diasRestantes = Math.max(0, diasNoMes - diaAtual);
  const falta = Math.max(0, m - r);
  const pct = m === 0 ? 100 : Math.min(100, Math.round((r / m) * 100));
  const esperado = (m * diaAtual) / diasNoMes;
  const ritmo: Ritmo = falta === 0 ? "batida" : r >= esperado * 0.8 ? "no_ritmo" : "atrasada";
  const semanas = Math.max(1, diasRestantes / 7);
  return { meta: m, realizado: r, pct, falta, diasRestantes, porSemana: Math.ceil((falta / semanas) * 10) / 10, ritmo };
}

export function metaValida(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 500;
}

export function mesValido(m: unknown): m is string {
  return typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}
