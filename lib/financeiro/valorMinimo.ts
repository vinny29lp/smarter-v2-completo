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

export const MSG_VALOR_MINIMO = "O valor mínimo cobrado da empresa é R$ 13,00 (cobre o seguro do estagiário). Informe um valor igual ou maior.";

/** Mensagem de erro se o valor informado for vazio, zero ou menor que o mínimo; null se estiver ok. */
export function validarValorMinimo(v: unknown): string | null {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return v === "" || v === null || v === undefined || !Number.isFinite(n) || n < VALOR_MINIMO_GESTAO ? MSG_VALOR_MINIMO : null;
}
