/**
 * rescisaoCalc.ts — Cálculo automático do Recibo de Rescisão de Estágio.
 *
 * Fundamento legal: Lei 11.788/2008, Art. 13 — recesso remunerado de 30 dias
 * a cada 12 meses de estágio, proporcional quando a vigência é menor
 * (2,5 dias por mês completo trabalhado — "avo").
 *
 * Regra dos 15 dias (mesma convenção usada em 13º salário/férias
 * proporcionais): a fração de mês após o último mês completo conta como
 * mais 1 avo se tiver 15 dias ou mais; com menos de 15 dias, não conta.
 * Ex: 6 meses e 20 dias de estágio → 7 avos; 6 meses e 10 dias → 6 avos.
 *
 * Regra especial do negócio (não é texto literal da lei, é prática definida
 * pela Smarter): se já se completaram 12 avos (pela regra dos 15 dias acima)
 * desde a última vez que o recesso foi concedido (ou desde o início do
 * estágio, se nunca foi) sem que o recesso tenha sido tirado nesse
 * intervalo, o cálculo passa a usar 14 avos em vez do teto normal de 12 —
 * cobre o adicional pela demora em conceder o recesso.
 *
 * Toda a matemática de datas usa os componentes UTC (getUTCFullYear/Month/Date)
 * para não depender do fuso horário do processo — datas de contrato e do
 * formulário são datas de calendário (sem hora), não instantes.
 */

const MS_DIA = 24 * 60 * 60 * 1000;

/** Normaliza uma data (Date ou string "YYYY-MM-DD") para meia-noite UTC do mesmo dia-calendário. */
export function paraDataCalendario(input: Date | string): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Dia do mês de `referencia` (1-31) — quantidade de dias de bolsa proporcional do último mês. */
export function diaDoMes(referencia: Date): number {
  return paraDataCalendario(referencia).getUTCDate();
}

/** Total de dias corridos entre duas datas, incluindo ambos os extremos. */
export function diasTotaisEntre(inicio: Date, fim: Date): number {
  const a = paraDataCalendario(inicio).getTime();
  const b = paraDataCalendario(fim).getTime();
  return Math.max(0, Math.round((b - a) / MS_DIA) + 1);
}

/** Meses completos entre duas datas — considera o dia do mês, não só mês/ano (ex: 15/01 a 14/02 ainda não fechou 1 mês). */
export function mesesCompletos(inicio: Date, fim: Date): number {
  const a = paraDataCalendario(inicio);
  const b = paraDataCalendario(fim);
  let meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) meses--;
  return Math.max(0, meses);
}

/**
 * Avos pela regra dos 15 dias: meses completos entre as datas, mais 1 avo
 * extra se a fração restante após o último mês completo tiver 15 dias ou
 * mais (fração menor não conta).
 */
export function mesesComFracao15Dias(inicio: Date, fim: Date): number {
  const a = paraDataCalendario(inicio);
  const b = paraDataCalendario(fim);
  const mesesBase = mesesCompletos(a, b);
  // Data-âncora: início + mesesBase meses (mesmo dia do mês; se o mês de
  // destino não tiver esse dia, o Date do JS rola para o mês seguinte —
  // caso raro, restrito a contratos iniciados nos dias 29-31).
  const ancora = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + mesesBase, a.getUTCDate()));
  const diasExtras = Math.round((b.getTime() - ancora.getTime()) / MS_DIA);
  return diasExtras >= 15 ? mesesBase + 1 : mesesBase;
}

export interface RecessoProporcional {
  /** Avos considerados — 0 a 12 no caso normal (regra dos 15 dias), 14 quando a regra especial se aplica. */
  avos: number;
  /** Dias de recesso remunerado (avos × 2,5). */
  dias: number;
  /** true quando passou 1 ano (12 avos) sem o recesso ser concedido e o adicional (14/12) foi aplicado. */
  regraEspecialAplicada: boolean;
}

export function calcularRecessoProporcional(inicio: Date, referencia: Date): RecessoProporcional {
  const avosBase = mesesComFracao15Dias(inicio, referencia);
  const regraEspecialAplicada = avosBase >= 12;
  const avos = regraEspecialAplicada ? 14 : avosBase;
  const dias = avos * 2.5;
  return { avos, dias, regraEspecialAplicada };
}

export interface CalculoRescisao {
  /** Dias de bolsa proporcional do último mês (dia 1 até o último dia de estágio). */
  diasBolsa: number;
  /** Valor da bolsa proporcional do último mês (bolsa mensal ÷ 30 × diasBolsa — mesma convenção do recibo). */
  bolsaProporcional: number;
  /** Total de dias corridos do estágio (início do contrato até o último dia), só informativo. */
  diasTrabalhados: number;
  /** Meses completos do estágio inteiro (início do contrato até o último dia), só informativo. */
  mesesTrabalhados: number;
  /** Avos de recesso considerados no cálculo (pode diferir de mesesTrabalhados se um recesso já foi tirado antes, ou 14 pela regra especial). */
  avosRecesso: number;
  /** Dias de recesso remunerado proporcional. */
  diasRecesso: number;
  /** Valor do recesso remunerado. */
  recessoValor: number;
  /** true quando passou 1 ano sem o recesso ser concedido e o adicional (14/12 avos) foi aplicado. */
  regraEspecialAplicada: boolean;
  /** Data a partir da qual os avos de recesso passaram a ser contados (início do contrato, ou dia seguinte ao fim do último recesso já concedido). */
  baseCalculoRecesso: Date;
  totalDescontos: number;
  totalBruto: number;
  totalLiquido: number;
}

export interface CalcularRescisaoInput {
  dataInicioContrato: Date | string;
  /** Bolsa mensal do contrato (R$). */
  bolsaMensal: number;
  /** Último dia efetivo de estágio — escolhido no formulário; se omitido, use `new Date()` no chamador. */
  ultimoDia: Date | string;
  /**
   * Se um recesso já foi formalizado e concluído durante o estágio, a data final
   * desse recesso — a contagem de avos reinicia no dia seguinte. `null`/`undefined`
   * quando nenhum recesso foi tirado ainda (conta desde o início do contrato).
   */
  recessoJaTiradoAte?: Date | string | null;
  /** Soma de descontos a abater do total (R$). */
  descontos?: number;
}

/**
 * Monta os campos do Recibo de Rescisão automaticamente a partir das datas do
 * contrato — nenhum dado numérico precisa ser digitado manualmente.
 */
export function calcularRescisao(input: CalcularRescisaoInput): CalculoRescisao {
  const inicio = paraDataCalendario(input.dataInicioContrato);
  const fim = paraDataCalendario(input.ultimoDia);
  const bolsaMensal = input.bolsaMensal || 0;
  const totalDescontos = input.descontos || 0;

  const diasBolsa = diaDoMes(fim);
  const bolsaDia = bolsaMensal / 30;
  const bolsaProporcional = bolsaDia * diasBolsa;

  const diasTrabalhados = diasTotaisEntre(inicio, fim);
  const mesesTrabalhados = mesesCompletos(inicio, fim);

  const baseCalculoRecesso = input.recessoJaTiradoAte
    ? new Date(paraDataCalendario(input.recessoJaTiradoAte).getTime() + MS_DIA)
    : inicio;
  const recesso = calcularRecessoProporcional(baseCalculoRecesso, fim);
  const recessoValor = recesso.dias * bolsaDia;

  const totalBruto = bolsaProporcional + recessoValor;
  const totalLiquido = totalBruto - totalDescontos;

  return {
    diasBolsa,
    bolsaProporcional,
    diasTrabalhados,
    mesesTrabalhados,
    avosRecesso: recesso.avos,
    diasRecesso: recesso.dias,
    recessoValor,
    regraEspecialAplicada: recesso.regraEspecialAplicada,
    baseCalculoRecesso,
    totalDescontos,
    totalBruto,
    totalLiquido,
  };
}
