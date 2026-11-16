/**
 * Regras puras do ciclo do estágio (sem banco e sem imports com "@/", testáveis no vitest):
 *  - avaliação semestral obrigatória (cobrança até a empresa preencher)
 *  - fim de estágio e limite de 2 anos (Lei 11.788/2008)
 *  - pesquisa de satisfação pós-estágio
 *  - vagas paradas / empresa sem retorno sobre candidatos
 */
const DIA = 86_400_000;
export const dias = (de: Date, ate: Date) => Math.floor((ate.getTime() - de.getTime()) / DIA);

// ───────────── Avaliação semestral (obrigatória: Lei 11.788/2008, art. 3º §1º e art. 7º IV) ─────────────
/** Começa a avisar 15 dias antes de fechar 6 meses (180 dias) desde a última avaliação respondida (ou do início). */
export const ANTECEDENCIA_SEMESTRAL_DIAS = 15;
export const CICLO_SEMESTRAL_DIAS = 180;
export const INTERVALO_COBRANCA_SEMESTRAL_DIAS = 5;
/** Teto de segurança (≈ 2 meses de cobrança). Depois disso a unidade segue alertada pelo painel. */
export const MAX_COBRANCAS_SEMESTRAL = 12;
/** A partir desta cobrança a unidade é avisada para ligar para a empresa. */
export const COBRANCA_ESCALA_UNIDADE = 3;

export function semestralDevida(p: {
  dataInicio: Date; ultimaRespondidaEm: Date | null; enviosDoCiclo: Date[]; agora: Date;
}): { acao: "primeira" | "cobranca"; numero: number; diasParaFechar: number } | null {
  const ref = p.ultimaRespondidaEm && p.ultimaRespondidaEm > p.dataInicio ? p.ultimaRespondidaEm : p.dataInicio;
  const idadeCiclo = dias(ref, p.agora);
  if (idadeCiclo < CICLO_SEMESTRAL_DIAS - ANTECEDENCIA_SEMESTRAL_DIAS) return null;
  const diasParaFechar = CICLO_SEMESTRAL_DIAS - idadeCiclo;
  const envios = p.enviosDoCiclo.filter(d => d.getTime() >= ref.getTime());
  if (envios.length === 0) return { acao: "primeira", numero: 1, diasParaFechar };
  if (envios.length >= MAX_COBRANCAS_SEMESTRAL) return null;
  const ultimo = new Date(Math.max(...envios.map(d => d.getTime())));
  if (dias(ultimo, p.agora) < INTERVALO_COBRANCA_SEMESTRAL_DIAS) return null;
  return { acao: "cobranca", numero: envios.length + 1, diasParaFechar };
}

// ───────────── Fim de estágio e limite de 2 anos ─────────────
/** Avisos ao estudante e à empresa: 30 e 7 dias antes do fim (a renovação 90/60/30 já avisa a empresa antes). */
export const MARCOS_FIM = [30, 7] as const;
export function marcoFim(diasParaFim: number): number | null {
  if (diasParaFim < 0) return null;
  const c = MARCOS_FIM.filter(m => diasParaFim <= m);
  return c.length ? Math.min(...c) : null;
}

/** Limite de 2 anos na mesma concedente, somando contratos anteriores do mesmo estudante na mesma empresa. */
export const LIMITE_ESTAGIO_DIAS = 730;
export function limiteDoisAnosAcumulado(primeiroInicio: Date, dataFim: Date): { diasTotais: number; noLimite: boolean; dataLimite: Date } {
  const diasTotais = dias(primeiroInicio, dataFim);
  const dataLimite = new Date(primeiroInicio.getTime() + LIMITE_ESTAGIO_DIAS * DIA);
  return { diasTotais, noLimite: diasTotais >= LIMITE_ESTAGIO_DIAS - 30, dataLimite };
}

// ───────────── Pesquisa de satisfação pós-estágio ─────────────
export const JANELA_PESQUISA_MIN_DIAS = 2;
export const JANELA_PESQUISA_MAX_DIAS = 30;
export function pesquisaDevida(p: { encerradoEm: Date | null; jaEnviada: boolean; agora: Date }): boolean {
  if (p.jaEnviada || !p.encerradoEm) return false;
  const d = dias(p.encerradoEm, p.agora);
  return d >= JANELA_PESQUISA_MIN_DIAS && d <= JANELA_PESQUISA_MAX_DIAS;
}

// ───────────── Vagas paradas / empresa sem retorno ─────────────
export const VAGA_PARADA_DIAS = 30;
export const INTERVALO_VAGA_DIAS = 15;
export const MAX_AVISOS_VAGA = 3;
/** Vaga aberta há 30+ dias: pergunta à empresa se ainda precisa; a cada 15 dias, no máximo 3 vezes. */
export function vagaParadaDevida(p: { criadaEm: Date | null; envios: Date[]; agora: Date }): { numero: number } | null {
  if (!p.criadaEm || dias(p.criadaEm, p.agora) < VAGA_PARADA_DIAS) return null;
  if (p.envios.length >= MAX_AVISOS_VAGA) return null;
  if (p.envios.length === 0) return { numero: 1 };
  const ultimo = new Date(Math.max(...p.envios.map(d => d.getTime())));
  return dias(ultimo, p.agora) >= INTERVALO_VAGA_DIAS ? { numero: p.envios.length + 1 } : null;
}

export const PRAZO_RETORNO_EMPRESA_DIAS = 7;
export const INTERVALO_RETORNO_DIAS = 7;
export const MAX_COBRANCAS_RETORNO = 3;
/** Candidatos esperando decisão da empresa (triagem/entrevista) há 7+ dias: cobra retorno a cada 7 dias, máx. 3. */
export function retornoEmpresaDevido(p: { maisAntigaParadaEm: Date | null; envios: Date[]; agora: Date }): { numero: number } | null {
  if (!p.maisAntigaParadaEm || dias(p.maisAntigaParadaEm, p.agora) < PRAZO_RETORNO_EMPRESA_DIAS) return null;
  if (p.envios.length >= MAX_COBRANCAS_RETORNO) return null;
  if (p.envios.length === 0) return { numero: 1 };
  const ultimo = new Date(Math.max(...p.envios.map(d => d.getTime())));
  return dias(ultimo, p.agora) >= INTERVALO_RETORNO_DIAS ? { numero: p.envios.length + 1 } : null;
}
