/**
 * #2 — Sequência de follow-up automático do CRM (pura, sem "@/", testável).
 * Até 3 e-mails por lead parado, espaçados, só para quem deu aceite (optIn).
 */
import { SLA_CONFIG } from "../crm/sla-config";

export const ETAPAS_FOLLOWUP = ["primeiro_contato", "apresentacao", "proposta", "negociacao"] as const;
export const MAX_FOLLOWUPS = 3;
export const INTERVALO_FOLLOWUP_DIAS = 4;
/** Limite diário por unidade para prospecção/follow-up automático (definido pelo dono do sistema). */
export const LIMITE_DIARIO_UNIDADE = 15;

export function proximoFollowup(p: {
  etapa: string | null | undefined;
  diasNaEtapa: number;
  enviados: number;
  diasDesdeUltimo: number | null;
}): number | null {
  const etapa = p.etapa || "";
  if (!(ETAPAS_FOLLOWUP as readonly string[]).includes(etapa)) return null;
  const sla = SLA_CONFIG[etapa]?.diasMax ?? 0;
  if (sla <= 0 || p.diasNaEtapa < sla) return null; // ainda dentro do prazo normal
  if (p.enviados >= MAX_FOLLOWUPS) return null;
  if (p.diasDesdeUltimo !== null && p.diasDesdeUltimo < INTERVALO_FOLLOWUP_DIAS) return null;
  return p.enviados + 1;
}

const primeiro = (n?: string | null) => (n || "").trim().split(/\s+/)[0] || "";

export function mensagemFollowup(
  etapa: string,
  numero: number,
  p: { empresa: string; contato?: string | null; unidade?: string | null },
): { assunto: string; corpo: string } {
  const oi = primeiro(p.contato) ? `Olá, ${primeiro(p.contato)}!` : "Olá!";
  const assina = `<p>Um abraço,<br/><strong>${p.unidade || "Smarter Estágios"}</strong></p>`;
  const fim = numero >= MAX_FOLLOWUPS;

  const trecho: Record<string, string> = {
    primeiro_contato: "Falei com você há alguns dias sobre como a Smarter pode cuidar de todo o processo de estágio da " + p.empresa + " (recrutamento, contratos, documentação e conformidade com a Lei 11.788).",
    apresentacao: "Queria retomar a nossa conversa sobre a apresentação da Smarter para a " + p.empresa + ".",
    proposta: "Enviamos a proposta para a " + p.empresa + " e queria saber se ficou alguma dúvida.",
    negociacao: "Estamos finalizando os detalhes com a " + p.empresa + " e queria saber o que falta para avançarmos.",
  };

  const abertura = numero === 1
    ? "Passando para saber se você conseguiu ver o material."
    : numero === 2
      ? "Sei que a rotina é corrida, então vou ser direto: posso ajudar com alguma dúvida?"
      : "Este é meu último contato por aqui, para não incomodar.";

  const fechamento = fim
    ? "<p>Se fizer sentido conversar mais pra frente, é só responder este e-mail que retomamos. Se preferir não receber mais mensagens, use o link ao final.</p>"
    : "<p>Se preferir, me diga o melhor dia e horário e eu te ligo — são 15 minutos.</p>";

  return {
    assunto: fim ? `Último contato — ${p.empresa}` : numero === 1 ? `${p.empresa}: conseguiu ver nosso material?` : `Retomando — ${p.empresa}`,
    corpo: `<p>${oi}</p><p>${trecho[etapa] || trecho.primeiro_contato}</p><p>${abertura}</p>${fechamento}${assina}`,
  };
}
