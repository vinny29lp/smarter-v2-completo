/** Trilha dos 30 contratos — regras puras (sem "@/"), testáveis. Fuso fixo America/Sao_Paulo (UTC-3, sem horário de verão). */
export const META_CONTRATOS = 30;
export const META_VISITAS_SEMANA = 10;
const DIA = 86_400_000;
const BRT = -3 * 3_600_000;

/** Segunda-feira 00:00 (BRT) da semana de `agora`, como instante UTC. */
export function inicioSemana(agora: Date): Date {
  const local = new Date(agora.getTime() + BRT);          // "relógio" de Brasília lido em campos UTC
  const dow = (local.getUTCDay() + 6) % 7;                // seg=0 … dom=6
  const seg = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow);
  return new Date(seg - BRT);
}

export type Semaforo = "verde" | "amarelo" | "vermelho";

/** Visitas esperadas até agora: meta × dias úteis já completos / 5 (segunda = 0). */
export function visitasEsperadas(agora: Date, meta = META_VISITAS_SEMANA): number {
  const local = new Date(agora.getTime() + BRT);
  const dow = (local.getUTCDay() + 6) % 7;
  const completos = Math.min(dow, 5);
  return Math.floor((meta * completos) / 5);
}

export function semaforoSemana(visitas: number, agora: Date, meta = META_VISITAS_SEMANA): Semaforo {
  if (visitas >= meta) return "verde";
  const esperado = visitasEsperadas(agora, meta);
  if (visitas >= esperado) return "verde";
  return visitas >= Math.ceil(esperado * 0.6) ? "amarelo" : "vermelho";
}

export interface Marco { dias: number; contratos: number; rotulo: string }
export const MARCOS: Marco[] = [
  { dias: 28, contratos: 1, rotulo: "1º contrato (semana 4)" },
  { dias: 56, contratos: 5, rotulo: "5 contratos (mês 2)" },
  { dias: 112, contratos: 10, rotulo: "10 contratos (mês 4)" },
  { dias: 240, contratos: 30, rotulo: "30 contratos (mês 8)" },
];

export type StatusMarco = "atingido" | "no_prazo" | "atrasado";

export function statusMarcos(diasDeOperacao: number, contratos: number) {
  return MARCOS.map(m => ({
    ...m,
    status: (contratos >= m.contratos ? "atingido" : diasDeOperacao > m.dias ? "atrasado" : "no_prazo") as StatusMarco,
    diasRestantes: Math.max(0, m.dias - diasDeOperacao),
  }));
}

/** Semáforo geral da unidade: pior entre o ritmo semanal e os marcos. */
export function semaforoGeral(semana: Semaforo, marcos: { status: StatusMarco }[]): Semaforo {
  if (marcos.some(m => m.status === "atrasado")) return "vermelho";
  return semana;
}

export const diasEntre = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / DIA);
