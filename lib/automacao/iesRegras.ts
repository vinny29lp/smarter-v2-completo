/** Regras puras da Lia para IES (convênio e relatório semestral). Sem imports de "@/". */

export const MAX_LEMBRETES_CONVENIO = 3;
export const INTERVALO_CONVENIO_DIAS = 10;
export const JANELA_RELATORIO_DIAS = 45;

const dias = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86_400_000);

/**
 * "convite": IES com estágios e convênio pendente que ainda não foi convidada.
 * "lembrete": já convidada e sem assinar, respeitando intervalo e máximo.
 */
export function convenioDevido(p: {
  status?: string | null; temEstagios: boolean; emailValido: boolean;
  conviteEnviadoEm?: Date | null; enviosLia: Date[]; agora: Date;
}): "convite" | "lembrete" | null {
  if (p.status !== "PENDENTE" || !p.emailValido) return null;
  const ultimos = [p.conviteEnviadoEm, ...p.enviosLia].filter((d): d is Date => !!d);
  if (ultimos.length === 0) return p.temEstagios ? "convite" : null;
  if (p.enviosLia.length >= MAX_LEMBRETES_CONVENIO) return null;
  const ultimo = new Date(Math.max(...ultimos.map(d => d.getTime())));
  return dias(ultimo, p.agora) >= INTERVALO_CONVENIO_DIAS ? "lembrete" : null;
}

/** Relatório semestral: avaliação respondida recentemente e ainda não enviada à IES. */
export function relatorioSemestralDevido(p: { respondidoAt?: Date | null; jaEnviado: boolean; agora: Date }): boolean {
  if (p.jaEnviado || !p.respondidoAt) return false;
  const d = dias(p.respondidoAt, p.agora);
  return d >= 0 && d <= JANELA_RELATORIO_DIAS;
}

export function periodoSemestre(d: Date): string {
  return `${d.getFullYear()}/${d.getMonth() < 6 ? "1" : "2"}`;
}
