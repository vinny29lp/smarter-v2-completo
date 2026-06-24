/**
 * CRM de Venda de Franquias — Configuração do Pipeline
 * Separado do CRM de parcerias empresariais (CrmLead).
 *
 * Etapas de venda de uma unidade Smarter:
 *   novo_lead → primeiro_contato → apresentacao → due_diligence → proposta → fechado
 */

export interface FranquiaStageConfig {
  label: string;
  slaDias: number;
  color: string;
  bgColor: string;
  emoji: string;
  descricao: string;
}

export const FRANQUIA_PIPELINE: Record<string, FranquiaStageConfig> = {
  novo_lead: {
    label: "Novo Lead",
    slaDias: 1,
    color: "#6366f1",
    bgColor: "#eef2ff",
    emoji: "🆕",
    descricao: "Lead recém-captado. Ação: entrar em contato em até 24h.",
  },
  primeiro_contato: {
    label: "Primeiro Contato",
    slaDias: 3,
    color: "#0ea5e9",
    bgColor: "#e0f2fe",
    emoji: "📞",
    descricao: "Primeiro contato realizado. Aguardando interesse inicial.",
  },
  apresentacao: {
    label: "Apresentação do Negócio",
    slaDias: 7,
    color: "#f59e0b",
    bgColor: "#fef3c7",
    emoji: "🎯",
    descricao: "Apresentação da Smarter, mercado e modelo de franquia realizada.",
  },
  due_diligence: {
    label: "Due Diligence",
    slaDias: 14,
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    emoji: "🔍",
    descricao: "Candidato analisando docs, números e conversando com franqueados.",
  },
  proposta: {
    label: "Proposta Financeira",
    slaDias: 7,
    color: "#f97316",
    bgColor: "#fff7ed",
    emoji: "📋",
    descricao: "Proposta formal enviada. Aguardando aprovação e assinatura.",
  },
  fechado: {
    label: "Contrato Assinado",
    slaDias: 0,
    color: "#10b981",
    bgColor: "#d1fae5",
    emoji: "🏆",
    descricao: "Franquia vendida! Processo de onboarding iniciado.",
  },
};

export const FRANQUIA_ETAPAS_ORDER = [
  "novo_lead",
  "primeiro_contato",
  "apresentacao",
  "due_diligence",
  "proposta",
  "fechado",
] as const;

/** Probabilidade de fechamento por etapa — para cálculo de pipeline ponderado */
export const FRANQUIA_PROB: Record<string, number> = {
  novo_lead: 0.05,
  primeiro_contato: 0.15,
  apresentacao: 0.30,
  due_diligence: 0.55,
  proposta: 0.80,
  fechado: 1.00,
};

/** Valor padrão da taxa de franquia (projeto expansão) */
export const TAXA_FRANQUIA_EXPANSAO = 6000;
export const TAXA_FRANQUIA_NORMAL   = 17000;

/** Status do SLA de um lead */
export function franquiaSlaStatus(etapa: string, etapaChangedAt?: Date | null): "ok" | "atencao" | "vencido" {
  const cfg = FRANQUIA_PIPELINE[etapa];
  if (!cfg || cfg.slaDias === 0 || !etapaChangedAt) return "ok";
  const diasPassados = Math.floor((Date.now() - new Date(etapaChangedAt).getTime()) / 86400000);
  if (diasPassados > cfg.slaDias) return "vencido";
  if (diasPassados >= cfg.slaDias * 0.75) return "atencao";
  return "ok";
}

export function franquiaDiasRestantes(etapa: string, etapaChangedAt?: Date | null): number {
  const cfg = FRANQUIA_PIPELINE[etapa];
  if (!cfg || cfg.slaDias === 0 || !etapaChangedAt) return 999;
  const diasPassados = Math.floor((Date.now() - new Date(etapaChangedAt).getTime()) / 86400000);
  return cfg.slaDias - diasPassados;
}
