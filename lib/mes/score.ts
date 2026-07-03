/**
 * score.ts — Cálculo do score de fechamento de mês (0-100)
 * Usado por app/api/app/mes/fechar e app/api/app/mes/relatorio
 */

export interface DadosScore {
  empresas: number;
  metaEmpresas: number;
  leads: number;
  metaLeads: number;
  contratos: number;
  metaContratos: number;
  horas: number;
  abriuNoPrazo: boolean; // abertura feita até dia 5
}

export function calcularScore(dados: DadosScore): number {
  let score = 0;
  // 25 pts: empresas (% da meta, máx 25)
  score += Math.min(25, Math.round((dados.empresas / Math.max(1, dados.metaEmpresas)) * 25));
  // 25 pts: leads (% da meta, máx 25)
  score += Math.min(25, Math.round((dados.leads / Math.max(1, dados.metaLeads)) * 25));
  // 25 pts: contratos (% da meta, máx 25)
  score += Math.min(25, Math.round((dados.contratos / Math.max(1, dados.metaContratos)) * 25));
  // 15 pts: horas no sistema (>= 40h = 15pts, proporcional abaixo)
  score += Math.min(15, Math.round((dados.horas / 40) * 15));
  // 10 pts: abriu no prazo
  if (dados.abriuNoPrazo) score += 10;
  return Math.min(100, score);
}
