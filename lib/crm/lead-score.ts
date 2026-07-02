/**
 * CRM — Lead Score da Apresentação Comercial
 *
 * Calcula a pontuação de engajamento do lead com base nos eventos registrados
 * na apresentação rastreável. O score é salvo em CrmLead.leadScore.
 *
 * Regras:
 *   +20  Abriu a apresentação
 *   +15  Abriu mais de uma vez
 *   +20  Ficou mais de 2 minutos
 *   +30  Clicou no botão de WhatsApp
 *   +40  Clicou em "Agendar conversa"
 *   -10  Não abriu em 48h após o envio (aplicado no cron/SLA)
 *
 * Classificação:
 *    0 – 30  → "frio"
 *   31 – 60  → "morno"
 *   61+      → "quente"
 */

export type LeadTemperatura = "frio" | "morno" | "quente";

export interface LeadScoreInput {
  apresentacaoAcessos: number;
  apresentacaoTempoSeg: number;
  apresentacaoCliques: string | null; // JSON array de tipos de clique
  apresentacaoEnviadaEm: Date | null;
  apresentacaoAbertaEm: Date | null;
}

export function calcularLeadScore(input: LeadScoreInput): number {
  let score = 0;
  const {
    apresentacaoAcessos,
    apresentacaoTempoSeg,
    apresentacaoCliques,
    apresentacaoEnviadaEm,
    apresentacaoAbertaEm,
  } = input;

  // Abriu ao menos uma vez
  if (apresentacaoAcessos >= 1) score += 20;

  // Abriu mais de uma vez
  if (apresentacaoAcessos > 1) score += 15;

  // Ficou mais de 2 minutos (120 segundos)
  if (apresentacaoTempoSeg >= 120) score += 20;

  // Cliques registrados
  const cliques: string[] = parseCliques(apresentacaoCliques);
  if (cliques.includes("clicou_whatsapp"))    score += 30;
  if (cliques.includes("clicou_agendamento")) score += 40;

  // Não abriu em 48h após envio
  if (
    apresentacaoEnviadaEm &&
    !apresentacaoAbertaEm &&
    Date.now() - new Date(apresentacaoEnviadaEm).getTime() > 48 * 60 * 60 * 1000
  ) {
    score -= 10;
  }

  return Math.max(0, score);
}

export function scoreParaTemperatura(score: number): LeadTemperatura {
  if (score >= 61) return "quente";
  if (score >= 31) return "morno";
  return "frio";
}

export function scoreLabel(score: number): string {
  const t = scoreParaTemperatura(score);
  if (t === "quente") return "🔴 Lead Quente";
  if (t === "morno")  return "🟡 Lead Morno";
  return "🔵 Lead Frio";
}

export function scoreBadgeClass(score: number): string {
  const t = scoreParaTemperatura(score);
  if (t === "quente") return "bg-red-100 text-red-700 border-red-200";
  if (t === "morno")  return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

/** Sugestão de follow-up baseada no comportamento */
export function followUpSugerido(
  lead: {
    contato?: string | null;
    empresa?: string | null;
    apresentacaoAcessos: number;
    apresentacaoTempoSeg: number;
    apresentacaoAbertaEm: Date | null;
    apresentacaoEnviadaEm: Date | null;
    apresentacaoCliques: string | null;
    franqueadoNome?: string;
    linkApresentacao?: string;
  }
): { mensagem: string; motivo: string } | null {
  const nome = lead.contato?.split(" ")[0] || "tudo bem?";
  const cliques = parseCliques(lead.apresentacaoCliques);
  const franqueado = lead.franqueadoNome || "Smarter Estágios";
  const link = lead.linkApresentacao || "";

  // Clicou em WhatsApp ou agendamento
  if (cliques.includes("clicou_whatsapp") || cliques.includes("clicou_agendamento")) {
    return {
      motivo: "Clicou em contato na apresentação",
      mensagem: `Olá, ${nome}! Tudo bem?\n\nVi que você demonstrou interesse em conversar com a Smarter.\n\nPodemos agendar uma conversa rápida para entender o perfil da sua empresa e quais oportunidades de estágio fariam sentido?\n\nAtenciosamente,\n${franqueado}`,
    };
  }

  // Abriu mais de uma vez
  if (lead.apresentacaoAcessos > 1) {
    return {
      motivo: "Acessou a apresentação mais de uma vez",
      mensagem: `Olá, ${nome}! Tudo bem?\n\nVi que você acessou nossa apresentação mais de uma vez. Acredito que o tema possa fazer sentido para sua empresa.\n\nPosso te chamar para uma conversa rápida e entender se existe alguma área onde um estagiário poderia ajudar sua equipe?\n\nAtenciosamente,\n${franqueado}`,
    };
  }

  // Abriu a apresentação
  if (lead.apresentacaoAcessos >= 1 && lead.apresentacaoAbertaEm) {
    return {
      motivo: "Abriu a apresentação",
      mensagem: `Olá, ${nome}! Tudo bem?\n\nVi que você conseguiu acessar nossa apresentação sobre contratação de estagiários.\n\nGostaria de saber se ficou alguma dúvida ou se faz sentido conversarmos rapidamente para entender como a Smarter pode apoiar sua empresa.\n\nAtenciosamente,\n${franqueado}`,
    };
  }

  // Não abriu em 48h
  if (
    lead.apresentacaoEnviadaEm &&
    !lead.apresentacaoAbertaEm &&
    Date.now() - new Date(lead.apresentacaoEnviadaEm).getTime() > 48 * 60 * 60 * 1000
  ) {
    return {
      motivo: "Não abriu em 48h",
      mensagem: `Olá, ${nome}! Tudo bem?\n\nPercebi que talvez você ainda não tenha tido tempo de visualizar a apresentação que enviei. Sem problemas!\n\nEla é bem rápida e mostra como sua empresa pode contratar estagiários com segurança e apoio completo da Smarter.\n\nSegue novamente o link:\n${link}\n\nAtenciosamente,\n${franqueado}`,
    };
  }

  return null;
}

function parseCliques(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  return [];
}

export function adicionarClique(existingJson: string | null, tipo: string): string {
  const cliques = parseCliques(existingJson);
  if (!cliques.includes(tipo)) cliques.push(tipo);
  return JSON.stringify(cliques);
}
