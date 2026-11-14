/** Recrutador da Alizo — regras puras (sem "@/", testáveis): perfil da vaga, notas do candidato e consentimento. */
export const recrutadorAtivo = () => process.env.ALIZO_RECRUTADOR_ATIVO === "true";

/** Só envia dados do estudante à Alizo com consentimento explícito registrado (LGPD). */
export const temConsentimento = (status: string | null | undefined) => status === "granted";

export function perfilDaVaga(v: { cursoRequerido?: string | null; area?: string | null; cidade?: string | null; uf?: string | null; nivel?: string | null; requisitos?: string | null }) {
  const p: Record<string, unknown> = {};
  const curso = v.cursoRequerido || v.area;
  if (curso) p.course = curso;
  if (v.cidade) p.city = v.cidade;
  if (v.uf) p.state = v.uf;
  if (v.nivel) p.level = v.nivel;
  if (v.requisitos) p.requirements = v.requisitos.slice(0, 500);
  return p;
}

export function tituloDaVaga(v: { titulo: string }) {
  return v.titulo.trim().slice(0, 120);
}

export function notasDoCandidato(e: { curso?: string | null; semestre?: string | null; periodo?: string | null; cidade?: string | null; uf?: string | null; discResult?: string | null }, matching?: number | null) {
  const partes = ["Candidato inscrito pelo Sistema Smarter"];
  if (e.curso) partes.push(`Curso: ${e.curso}`);
  const sem = e.semestre || e.periodo;
  if (sem) partes.push(`Semestre/período: ${sem}`);
  if (e.cidade) partes.push(`Local: ${e.cidade}${e.uf ? "/" + e.uf : ""}`);
  if (e.discResult) partes.push(`DISC: ${e.discResult}`);
  if (matching != null) partes.push(`Matching Smarter: ${matching}%`);
  return partes.join(" · ").slice(0, 500);
}
