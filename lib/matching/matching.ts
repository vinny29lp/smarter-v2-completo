/** #7 — Matching estudante × vaga (função pura, sem "@/", testável). Score 0–100 com motivos legíveis. */
export interface EstudanteMatch {
  curso?: string | null; cidade?: string | null; uf?: string | null; semestre?: string | null; periodo?: string | null;
  discResult?: string | null; habilidades?: string[] | null; celular?: string | null; curriculo?: unknown; email?: string | null;
}
export interface VagaMatch {
  cursoRequerido?: string | null; area?: string | null; titulo?: string | null; cidade?: string | null; uf?: string | null;
  discDesejado?: string | null; requisitos?: string | null;
}

export const norm = (s?: string | null) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const STOP = new Set(["de", "da", "do", "em", "e", "a", "o", "para", "com", "curso", "superior", "tecnologo", "bacharelado"]);
const tokens = (s?: string | null) => norm(s).split(" ").filter(t => t.length > 2 && !STOP.has(t));

function afinidadeCurso(curso: string | null | undefined, alvo: string | null | undefined): number {
  const a = tokens(curso), b = tokens(alvo);
  if (a.length === 0 || b.length === 0) return 0;
  if (norm(curso) === norm(alvo)) return 1;
  const comuns = a.filter(t => b.some(u => u === t || u.startsWith(t) || t.startsWith(u))).length;
  return comuns / Math.min(a.length, b.length);
}

export function calcularMatching(e: EstudanteMatch, v: VagaMatch): { score: number; motivos: string[] } {
  let score = 0;
  const motivos: string[] = [];

  // Curso (40)
  const alvo = v.cursoRequerido || v.area || null;
  if (alvo) {
    const af = afinidadeCurso(e.curso, alvo);
    score += Math.round(af * 40);
    if (af >= 0.99) motivos.push("Curso exatamente o pedido");
    else if (af > 0) motivos.push("Curso relacionado à vaga");
  } else {
    score += 20; // vaga aberta a qualquer curso
    const af = afinidadeCurso(e.curso, v.titulo);
    if (af > 0) { score += Math.round(af * 10); motivos.push("Curso combina com o título da vaga"); }
  }

  // Localização (25)
  if (norm(e.cidade) && norm(e.cidade) === norm(v.cidade)) { score += 25; motivos.push("Mesma cidade"); }
  else if (norm(e.uf) && norm(e.uf) === norm(v.uf)) { score += 10; motivos.push("Mesmo estado"); }

  // DISC (15)
  if (v.discDesejado && e.discResult) {
    if (e.discResult === v.discDesejado) { score += 15; motivos.push("Perfil DISC desejado"); }
    else score += 4;
  } else if (!v.discDesejado) score += 7;

  // Semestre informado (10): quem está no meio do curso tem mais aderência a estágio
  const sem = parseInt(String(e.semestre || e.periodo || "").replace(/\D/g, ""), 10);
  if (Number.isFinite(sem) && sem > 0) { score += sem >= 3 && sem <= 8 ? 10 : 5; if (sem >= 3 && sem <= 8) motivos.push("Semestre ideal para estágio"); }

  // Perfil completo (10)
  let comp = 0;
  if (e.celular) comp += 3;
  if (e.curriculo) comp += 4;
  if (e.habilidades && e.habilidades.length > 0) comp += 3;
  score += comp;
  if (comp >= 7) motivos.push("Perfil completo");

  return { score: Math.max(0, Math.min(100, score)), motivos };
}

export function rankear<T extends EstudanteMatch>(estudantes: T[], v: VagaMatch, minimo = 0) {
  return estudantes
    .map(e => ({ estudante: e, ...calcularMatching(e, v) }))
    .filter(r => r.score >= minimo)
    .sort((a, b) => b.score - a.score);
}
