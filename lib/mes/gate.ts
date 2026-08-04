/**
 * gate.ts — Regra única de "mês anterior precisa estar fechado".
 *
 * Fonte única de verdade usada tanto por lib/mes/status.ts (o que a UI mostra)
 * quanto por app/api/app/mes/abrir/route.ts (o que o backend permite). Antes
 * de existir este módulo, as duas checagens viviam duplicadas e divergiam:
 * o status nunca olhava o mês anterior (UI sempre oferecia "abrir mês atual"),
 * e a rota de abrir só verificava o mês anterior quando mes > 1 (não tratava
 * virada de ano), deixando dezembro nunca-fechado passar batido em janeiro.
 */

export function mesAnteriorDe(mes: number, ano: number): { mes: number; ano: number } {
  return mes === 1 ? { mes: 12, ano: ano - 1 } : { mes: mes - 1, ano };
}

export interface AberturaAnteriorInfo {
  existe: boolean;
  fechada: boolean;
}

/** Verdadeiro quando a unidade abriu o mês anterior mas nunca o fechou. */
export function precisaFecharMesAnterior(info: AberturaAnteriorInfo): boolean {
  return info.existe && !info.fechada;
}

export interface MesStatusFlagsInput {
  dia: number;
  aberturaAtualExiste: boolean;
  aberturaAnterior: AberturaAnteriorInfo;
}

export interface MesStatusFlags {
  deveAbrir: boolean;
  bloqueado: boolean;
  mesAnteriorPendente: boolean;
}

/**
 * Decide deveAbrir/bloqueado/mesAnteriorPendente a partir de primitivos —
 * sem tocar banco, para ser testável isoladamente. lib/mes/status.ts é a
 * única chamadora em produção (depois de buscar os dados no Prisma).
 */
export function computeMesStatusFlags(input: MesStatusFlagsInput): MesStatusFlags {
  const mesAnteriorPendente = precisaFecharMesAnterior(input.aberturaAnterior);
  const deveAbrir = !input.aberturaAtualExiste;
  // Bloqueia tanto pelo prazo normal (dia >= 5 sem abertura) quanto,
  // independente do dia, sempre que o mês anterior ficou pendente — sem isso
  // a unidade via só o CTA de abrir o mês atual, que o backend rejeita, sem
  // nenhum caminho visível para fechar o mês anterior.
  const bloqueado = (input.dia >= 5 && !input.aberturaAtualExiste) || mesAnteriorPendente;
  return { deveAbrir, bloqueado, mesAnteriorPendente };
}
