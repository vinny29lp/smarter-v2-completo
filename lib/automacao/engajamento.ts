/** #3 #5 #8 #10 — regras puras das automações de engajamento (sem "@/", testáveis). */
const DIA = 86_400_000;
export const diasDesde = (d: Date, agora: Date) => Math.floor((agora.getTime() - d.getTime()) / DIA);

/** #3 Reativação de empresa sem contrato: 1º aviso após 30 dias de cadastro; reenvio a cada 45 dias; máx. 3. */
export const MAX_REATIVACOES = 3;
export const INTERVALO_REATIVACAO_DIAS = 45;
export function reativacaoDevida(p: { cadastradaEm: Date | null; envios: Date[]; agora: Date }): boolean {
  if (p.envios.length >= MAX_REATIVACOES) return false;
  if (p.cadastradaEm && diasDesde(p.cadastradaEm, p.agora) < 30) return false;
  if (p.envios.length === 0) return true;
  const ultimo = new Date(Math.max(...p.envios.map(d => d.getTime())));
  return diasDesde(ultimo, p.agora) >= INTERVALO_REATIVACAO_DIAS;
}

/** #5 Ativação do portal: empresa com estágio ativo cujo usuário nunca entrou. 1º aviso após 3 dias; a cada 10 dias; máx. 3. */
export const MAX_AVISOS_PORTAL = 3;
export const INTERVALO_PORTAL_DIAS = 10;
export function ativacaoPortalDevida(p: { usuarioCriadoEm: Date | null; nuncaEntrou: boolean; envios: Date[]; agora: Date }): boolean {
  if (!p.nuncaEntrou) return false;
  if (p.envios.length >= MAX_AVISOS_PORTAL) return false;
  if (p.usuarioCriadoEm && diasDesde(p.usuarioCriadoEm, p.agora) < 3) return false;
  if (p.envios.length === 0) return true;
  const ultimo = new Date(Math.max(...p.envios.map(d => d.getTime())));
  return diasDesde(ultimo, p.agora) >= INTERVALO_PORTAL_DIAS;
}

/** #8 Shortlist automática: vaga aberta há 2–30 dias com menos de 3 candidatos; nova rodada só após 10 dias. */
export const MIN_CANDIDATOS_VAGA = 3;
export const TAMANHO_SHORTLIST = 5;
export const SCORE_MINIMO_CONVITE = 50;
export const MAX_CONVITES_ESTUDANTE_SEMANA = 3;
export function vagaPrecisaShortlist(p: { criadaEm: Date | null; candidatos: number; ultimaRodada: Date | null; agora: Date }): boolean {
  if (p.candidatos >= MIN_CANDIDATOS_VAGA) return false;
  if (!p.criadaEm) return false;
  const idade = diasDesde(p.criadaEm, p.agora);
  if (idade < 2 || idade > 30) return false;
  if (p.ultimaRodada && diasDesde(p.ultimaRodada, p.agora) < 10) return false;
  return true;
}

/** #10 Funil: candidatura parada na mesma etapa além do prazo (inscritos 5d, triagem 7d, entrevista 7d). */
export const DIAS_CANDIDATURA_PARADA = 5;
export const PRAZO_ETAPA_DIAS: Record<string, number> = { inscritos: 5, triagem: 7, entrevista: 7 };
export function candidaturaParada(p: { etapa: string | null; desde: Date | null; agora: Date }): boolean {
  const prazo = PRAZO_ETAPA_DIAS[p.etapa || "inscritos"];
  return !!prazo && !!p.desde && diasDesde(p.desde, p.agora) >= prazo;
}
export function lembreteEntrevistaDevido(entrevistaAt: Date | null, agora: Date): boolean {
  if (!entrevistaAt) return false;
  const h = (entrevistaAt.getTime() - agora.getTime()) / 3_600_000;
  return h >= 18 && h <= 30;
}

export const ETAPAS_FUNIL = ["inscritos", "triagem", "entrevista", "aprovado", "reprovado"] as const;
export const etapaValida = (e: unknown): e is (typeof ETAPAS_FUNIL)[number] =>
  typeof e === "string" && (ETAPAS_FUNIL as readonly string[]).includes(e);
