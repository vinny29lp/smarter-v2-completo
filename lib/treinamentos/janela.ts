/** Treinamento disponível por 3 meses no painel da unidade. Sem imports "@/" (testável). */
export const DIAS_TREINAMENTO = 90;
/** Unidades que já existiam no lançamento contam os 90 dias a partir desta data. */
export const LANCAMENTO_TREINAMENTO = new Date("2026-11-16T00:00:00-03:00");

export function janelaTreinamento(criadaEm: Date | null | undefined, agora = new Date()) {
  const base = criadaEm && criadaEm > LANCAMENTO_TREINAMENTO ? criadaEm : LANCAMENTO_TREINAMENTO;
  const fim = new Date(base.getTime() + DIAS_TREINAMENTO * 86_400_000);
  const diasRestantes = Math.ceil((fim.getTime() - agora.getTime()) / 86_400_000);
  return { fim, diasRestantes: Math.max(0, diasRestantes), ativo: agora < fim };
}
