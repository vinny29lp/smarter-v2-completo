/** #27 — utilitários puros da lixeira (sem "@/", testáveis): serialização e restauração de linhas. */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Converte datas ISO de volta para Date (JSON as perde) e remove chaves nulas (o banco usa o default/NULL). */
export function reviverLinha<T = any>(linha: any): T {
  const out: any = {};
  for (const [k, v] of Object.entries(linha || {})) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === "string" && ISO.test(v) ? new Date(v) : v;
  }
  return out;
}

export function reviverLinhas<T = any>(linhas: any[] | undefined): T[] {
  return (linhas || []).map(l => reviverLinha<T>(l));
}

export const DIAS_RETENCAO_LIXEIRA = 90;

export function expiraEm(agora = new Date()): Date {
  return new Date(agora.getTime() + DIAS_RETENCAO_LIXEIRA * 86_400_000);
}

export function expirada(expira: Date | string | null | undefined, agora = new Date()): boolean {
  return !!expira && new Date(expira).getTime() < agora.getTime();
}
