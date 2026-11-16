/**
 * Quem pode gerar/enviar o contrato de gestão (CPS) de uma empresa.
 * Empresas MIGRADAS (origem=MIGRADO, sem unidade) são visíveis a todas as unidades; para o CPS a unidade
 * logada opera sobre elas SEM virar dona (a edição dos dados continua só da FRANQUEADORA) e é ela a parte contratante.
 */
export interface EmpresaAcesso { franchiseId: string | null; origem?: string | null }
export interface SessaoAcesso { role?: string | null; franchiseId?: string | null }

export const ehMigradaSemUnidade = (e: EmpresaAcesso) => e.origem === "MIGRADO" && !e.franchiseId;

export function podeOperarCps(e: EmpresaAcesso, s: SessaoAcesso): boolean {
  if (s.role === "FRANQUEADORA") return true;
  if (!s.franchiseId || s.franchiseId === "FRANQUEADORA") return false;
  if (e.franchiseId === s.franchiseId) return true;
  return ehMigradaSemUnidade(e) && (s.role === "FRANQUEADO" || s.role === "FUNCIONARIO");
}
