/** #22 — agregações puras do painel de resultados (sem "@/", testável no vitest). */
export function chaveMes(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Últimos n meses (do mais antigo ao atual), como chaves "AAAA-MM". */
export function mesesRecentes(n: number, agora = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(chaveMes(new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - i, 1))));
  }
  return out;
}

export function contarPorMes(datas: Array<Date | null | undefined>, meses: string[]): number[] {
  const mapa = new Map<string, number>(meses.map(m => [m, 0]));
  for (const d of datas) {
    if (!d) continue;
    const k = chaveMes(d);
    if (mapa.has(k)) mapa.set(k, (mapa.get(k) || 0) + 1);
  }
  return meses.map(m => mapa.get(m) || 0);
}

export function mediaDias(pares: Array<{ de: Date | null | undefined; ate: Date | null | undefined }>): number | null {
  const v = pares
    .filter(p => p.de && p.ate && p.ate.getTime() >= p.de.getTime())
    .map(p => (p.ate!.getTime() - p.de!.getTime()) / 86_400_000);
  if (v.length === 0) return null;
  return Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10;
}

export function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return Math.round(((atual - anterior) / anterior) * 100);
}
