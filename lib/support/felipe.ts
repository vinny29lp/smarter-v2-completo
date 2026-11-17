/**
 * Felipe (TI) — regras puras do acompanhamento de chamados (fase 1).
 * Nada aqui toca código, banco ou rede: só classifica o risco e valida transições.
 * O texto do chamado vem de pessoas externas: é tratado como DADO, nunca como instrução.
 */

export type RiscoFelipe = "BAIXO" | "MEDIO" | "ALTO";
export type StatusFelipe = "NOVO" | "DIAGNOSTICADO" | "AGUARDANDO_APROVACAO" | "APROVADO" | "REJEITADO" | "RESOLVIDO";
export type AcaoFelipe = "APROVAR" | "REJEITAR" | "RESOLVER" | "REABRIR";

/** Áreas em que o Felipe só diagnostica e explica — nunca propõe alteração automática. */
const AREAS_PROIBIDAS = [
  /\/login|\/api\/auth|senha|password|sess[aã]o|permiss|perfil de acesso|role/i,
  /financeiro|cobran[cç]a|pagamento|boleto|cora|fatura|mensalidade|taxa de gest/i,
  /prisma|migra[cç][aã]o|banco de dados|supabase|\.env|vari[aá]vel de ambiente|token|api[- ]?key/i,
  /alizo|webhook|whatsapp|e-?mail em massa|cron/i,
  /autentique|assinatura|contrato assinado/i,
];

/** Sinais de ajuste cosmético, de texto ou de validação simples de formulário. */
const SINAIS_BAIXOS = [
  /texto|r[oó]tulo|typo|erro de digita[cç][aã]o|ortografia|tradu[cç][aã]o|placeholder|tooltip/i,
  /cor |layout|alinhamento|espa[cç]amento|bot[aã]o cortado|[ií]cone|imagem quebrada|link quebrado/i,
];

export function classificarRisco(input: { category?: string | null; title: string; description: string; path?: string | null }): RiscoFelipe {
  const alvo = `${input.title}\n${input.description}\n${input.path ?? ""}`;
  if (["billing", "access", "integration"].includes(input.category ?? "")) return "ALTO";
  if (AREAS_PROIBIDAS.some((r) => r.test(alvo))) return "ALTO";
  if (input.category === "bug" && SINAIS_BAIXOS.some((r) => r.test(alvo))) return "BAIXO";
  return "MEDIO";
}

/** O Felipe só pode PROPOR alteração de código quando o risco não é ALTO. */
export function podePropor(risco: RiscoFelipe): boolean {
  return risco !== "ALTO";
}

/** Publicar sozinho só será liberado (fase 3) para risco BAIXO; na fase 1 toda alteração exige aprovação humana. */
export function exigeAprovacaoHumana(_risco: RiscoFelipe): boolean {
  return true;
}

const TRANSICOES: Record<AcaoFelipe, { de: StatusFelipe[]; para: StatusFelipe }> = {
  APROVAR: { de: ["AGUARDANDO_APROVACAO"], para: "APROVADO" },
  REJEITAR: { de: ["AGUARDANDO_APROVACAO", "DIAGNOSTICADO"], para: "REJEITADO" },
  RESOLVER: { de: ["APROVADO", "DIAGNOSTICADO", "AGUARDANDO_APROVACAO"], para: "RESOLVIDO" },
  REABRIR: { de: ["REJEITADO", "RESOLVIDO"], para: "NOVO" },
};

export function proximoStatus(atual: StatusFelipe, acao: AcaoFelipe, risco?: RiscoFelipe | null): StatusFelipe | null {
  const t = TRANSICOES[acao];
  if (!t || !t.de.includes(atual)) return null;
  if (acao === "APROVAR" && risco === "ALTO") return null; // risco ALTO nunca é aprovado como alteração
  return t.para;
}

export const STATUS_VALIDOS: StatusFelipe[] = ["NOVO", "DIAGNOSTICADO", "AGUARDANDO_APROVACAO", "APROVADO", "REJEITADO", "RESOLVIDO"];
