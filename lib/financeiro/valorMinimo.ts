/**
 * Valor mínimo mensal cobrado da empresa por contrato ativo (Taxa de Gestão).
 * R$ 13,00 cobre o seguro obrigatório do estagiário: uma vez ativo o estágio, o seguro
 * precisa ser pago independentemente do valor combinado com a empresa. Nunca pode ser zero.
 */
export const VALOR_MINIMO_GESTAO = 13;

export function garantirValorMinimo(v: number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= VALOR_MINIMO_GESTAO ? n : VALOR_MINIMO_GESTAO;
}
