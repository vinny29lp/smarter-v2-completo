/**
 * Regras puras das automações da Lia (sem banco e sem imports com "@/", para testar no vitest).
 */
const DIA = 86_400_000;

export function diasEntre(de: Date, ate: Date): number {
  return Math.floor((ate.getTime() - de.getTime()) / DIA);
}

/** #17 — Renovação: marcos de 90/60/30 dias antes do fim. Retorna o menor marco ainda não ultrapassado. */
export const MARCOS_RENOVACAO = [90, 60, 30] as const;
export function marcoRenovacao(diasParaFim: number): number | null {
  if (diasParaFim < 0) return null;
  const candidatos = MARCOS_RENOVACAO.filter(m => diasParaFim <= m);
  return candidatos.length ? Math.min(...candidatos) : null;
}

/** Lei 11.788/2008: o estágio na mesma concedente não passa de 2 anos — acima disso o caminho é efetivar. */
export function limiteDeDoisAnos(inicio: Date, fim: Date): boolean {
  return diasEntre(inicio, fim) >= 700;
}

/** #19 — Avaliações aos 30, 90 e 180 dias de estágio. Só vale na janela de 14 dias após o marco (evita disparo atrasado/antigo). */
export const MARCOS_AVALIACAO = [30, 90, 180] as const;
export const JANELA_AVALIACAO_DIAS = 14;
export function marcoAvaliacao(diasDeEstagio: number): number | null {
  for (const m of [...MARCOS_AVALIACAO].reverse()) {
    if (diasDeEstagio >= m && diasDeEstagio <= m + JANELA_AVALIACAO_DIAS) return m;
  }
  return null;
}

/** #14 — Lembrete de assinatura: 1º com 2 dias de envio, depois a cada 3 dias, no máximo 4 lembretes por pessoa. */
export const MAX_LEMBRETES_ASSINATURA = 4;
export const IDADE_MAX_DOC_DIAS = 60;
export function deveLembrarAssinatura(p: {
  idadeDocDias: number;
  lembretesAnteriores: number;
  diasDesdeUltimoLembrete: number | null;
}): boolean {
  if (p.idadeDocDias < 2 || p.idadeDocDias > IDADE_MAX_DOC_DIAS) return false;
  if (p.lembretesAnteriores >= MAX_LEMBRETES_ASSINATURA) return false;
  if (p.diasDesdeUltimoLembrete === null) return true;
  return p.diasDesdeUltimoLembrete >= 3;
}

export function normalizarEmail(e: string | null | undefined): string {
  return (e || "").trim().toLowerCase();
}

export function emailValido(e: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(e));
}
