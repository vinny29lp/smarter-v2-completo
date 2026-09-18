/**
 * competencia.ts — Utilitário puro de "competência" (YYYY-MM) usado pelos
 * fechamentos mensais (fechar-mes.ts, cobrancaGestaoMensal.ts).
 *
 * Fica num arquivo à parte, sem importar @/lib/prisma, porque o vitest
 * deste projeto não resolve o alias "@/" (sem vitest.config) — qualquer
 * arquivo que precise ser testado com `npx vitest` tem que ser
 * autocontido, sem esse import.
 */

/** "YYYY-MM" a partir de uma data — usa os componentes UTC (mesma convenção de lib/financeiro/atraso.ts). */
export function competenciaDeData(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
