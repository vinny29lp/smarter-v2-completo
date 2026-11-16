/** Guia de recrutamento da vaga (funções puras, testáveis): mensagens, canais de divulgação e próximo passo. */
export interface CanalDivulgacao { id: string; rotulo: string; href: string; dica: string }

export function textoDivulgacao(p: { titulo: string; empresa?: string | null; cidade?: string | null; bolsa?: number | null; curso?: string | null; link: string }): string {
  return `📢 Vaga de estágio${p.cidade ? " em " + p.cidade : ""}: ${p.titulo}${p.curso ? " (" + p.curso + ")" : ""}${p.bolsa ? ` — bolsa R$ ${Number(p.bolsa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}. Candidate-se pelo link: ${p.link}`;
}

export function canaisDivulgacao(p: { titulo: string; cidade?: string | null; uf?: string | null }): CanalDivulgacao[] {
  const busca = encodeURIComponent(`${p.titulo} estágio ${p.cidade || ""}`.trim());
  return [
    { id: "indeed", rotulo: "Indeed", href: "https://employers.indeed.com/", dica: "Publique a vaga (gratuito) com o texto pronto abaixo." },
    { id: "infojobs", rotulo: "InfoJobs", href: "https://www.infojobs.com.br/", dica: "Cadastre a vaga de estágio na sua cidade." },
    { id: "linkedin", rotulo: "LinkedIn", href: `https://www.linkedin.com/jobs/search/?keywords=${busca}`, dica: "Publique um post com o link da vaga e envie para grupos de estudantes da região." },
    { id: "instagram", rotulo: "Instagram / Stories", href: "https://www.instagram.com/", dica: "Poste a vaga nos Stories da unidade e peça para compartilharem." },
    { id: "escolas", rotulo: "Faculdades e escolas técnicas", href: `https://www.google.com/search?q=${encodeURIComponent(`faculdades ${p.cidade || ""} ${p.uf || ""} coordenação de curso estágio`)}`, dica: "Envie a vaga por e-mail ou WhatsApp para coordenadores e murais dos cursos compatíveis." },
  ];
}

/** Próximo passo do recrutamento a partir do número de candidatos. */
export function proximoPassoVaga(candidatos: number): { id: "divulgar" | "aguardar" | "agendar"; texto: string } {
  if (candidatos >= 2) return { id: "agendar", texto: "Você já tem candidatos interessados. Agende o processo seletivo com a empresa." };
  if (candidatos === 1) return { id: "aguardar", texto: "1 candidato interessado. Mais 1 ou 2 e já dá para marcar o processo seletivo — chame os sugeridos no WhatsApp." };
  return { id: "divulgar", texto: "Ainda sem candidatos. Chame os sugeridos no WhatsApp e divulgue a vaga nos canais abaixo." };
}
