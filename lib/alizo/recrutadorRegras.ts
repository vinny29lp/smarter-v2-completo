/** Recrutador da Alizo — regras puras (sem "@/", testáveis): perfil da vaga, notas do candidato e consentimento. */
export const recrutadorAtivo = () => process.env.ALIZO_RECRUTADOR_ATIVO === "true";

/** Só envia dados do estudante à Alizo com consentimento explícito registrado (LGPD). */
export const temConsentimento = (status: string | null | undefined) => status === "granted";

export const APP_URL_VAGAS = "https://sistema.smarterestagios.com.br";

/** Link público da vaga no Smarter (candidatura). Sem slug, não há link — o Recrutador não deve inventar um. */
export function linkPublicoDaVaga(publicSlug?: string | null): string | null {
  const slug = (publicSlug || "").trim();
  return slug ? `${APP_URL_VAGAS}/vaga/${encodeURIComponent(slug)}` : null;
}

export function perfilDaVaga(v: {
  cursoRequerido?: string | null; area?: string | null; cidade?: string | null; uf?: string | null; nivel?: string | null;
  requisitos?: string | null; publicSlug?: string | null; descricao?: string | null; bolsa?: number | null;
  auxTransporte?: number | null; horario?: string | null; diasSemana?: string | null; modalidade?: string | null;
  cargaHoraria?: number | null; beneficios?: string | null;
}) {
  const p: Record<string, unknown> = {};
  const curso = v.cursoRequerido || v.area;
  if (curso) p.course = curso;
  if (v.cidade) p.city = v.cidade;
  if (v.uf) p.state = v.uf;
  if (v.nivel) p.level = v.nivel;
  if (v.requisitos) p.requirements = v.requisitos.slice(0, 500);
  const link = linkPublicoDaVaga(v.publicSlug);
  if (link) p.apply_url = link; // link de divulgação/candidatura
  if (v.descricao) p.description = v.descricao.slice(0, 800);
  if (v.bolsa != null && v.bolsa > 0) p.stipend = v.bolsa;
  if (v.auxTransporte != null && v.auxTransporte > 0) p.transport_aid = v.auxTransporte;
  if (v.horario) p.schedule = v.horario;
  if (v.diasSemana) p.days = v.diasSemana;
  if (v.modalidade) p.modality = v.modalidade;
  if (v.cargaHoraria) p.weekly_hours = v.cargaHoraria;
  if (v.beneficios) p.benefits = v.beneficios.slice(0, 300);
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
