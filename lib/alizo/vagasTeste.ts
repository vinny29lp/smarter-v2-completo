/**
 * Vagas de TESTE criadas na Alizo durante a integração. Só estes títulos exatos são candidatos à exclusão,
 * e só se NÃO estiverem ligados a uma vaga real do Smarter (vacancies.alizoJobId).
 */
export const TITULOS_VAGAS_TESTE = ["[TESTE INTEGRACAO] Estagiário de Direito", "Suporte Administrativo"];

const norm = (t: unknown) => String(t ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export function selecionarVagasTeste(jobs: Array<{ id?: unknown; title?: unknown }>, idsVinculados: Set<string>): Array<{ id: string; title: string }> {
  const alvo = new Set(TITULOS_VAGAS_TESTE.map(norm));
  return jobs
    .filter((j) => typeof j.id === "string" && j.id && alvo.has(norm(j.title)) && !idsVinculados.has(j.id as string))
    .map((j) => ({ id: j.id as string, title: String(j.title) }));
}
