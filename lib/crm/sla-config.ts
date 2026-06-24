/**
 * CRM — Configuração de SLA por etapa do pipeline
 *
 * Edite APENAS os valores de `diasMax` para ajustar os prazos.
 * Etapas terminais (fechado_ganho, fechado_perdido) devem ter diasMax: 0.
 */

export interface SlaEtapa {
  label: string;
  diasMax: number; // 0 = terminal (sem SLA)
  cor: string;     // cor Tailwind do cabeçalho no kanban
}

export const SLA_CONFIG: Record<string, SlaEtapa> = {
  novo_lead: {
    label: "Novo Lead",
    diasMax: 1,
    cor: "bg-slate-50 border-slate-200",
  },
  primeiro_contato: {
    label: "Contatado",
    diasMax: 3,
    cor: "bg-blue-50 border-blue-200",
  },
  apresentacao: {
    label: "Reunião Agendada",
    diasMax: 7,
    cor: "bg-purple-50 border-purple-200",
  },
  proposta: {
    label: "Proposta Enviada",
    diasMax: 5,
    cor: "bg-amber-50 border-amber-200",
  },
  negociacao: {
    label: "Em Negociação",
    diasMax: 10,
    cor: "bg-orange-50 border-orange-200",
  },
  fechado: {
    label: "Fechado ✓",
    diasMax: 0,
    cor: "bg-green-50 border-green-200",
  },
};

/** Dias corridos que o lead está na etapa atual. */
export function diasNaEtapa(etapaChangedAt: Date | string | null | undefined): number {
  if (!etapaChangedAt) return 0;
  const diff = Date.now() - new Date(etapaChangedAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** Status de SLA: ok | alerta (≥75% do prazo) | vencido (≥100%) | terminal */
export function slaStatus(
  etapa: string,
  etapaChangedAt: Date | string | null | undefined
): "ok" | "alerta" | "vencido" | "terminal" {
  const cfg = SLA_CONFIG[etapa];
  if (!cfg || cfg.diasMax === 0) return "terminal";
  const dias = diasNaEtapa(etapaChangedAt);
  if (dias >= cfg.diasMax) return "vencido";
  if (dias >= cfg.diasMax * 0.75) return "alerta";
  return "ok";
}

/** Dias restantes antes de vencer o SLA (negativo = já venceu). */
export function diasRestantes(
  etapa: string,
  etapaChangedAt: Date | string | null | undefined
): number | null {
  const cfg = SLA_CONFIG[etapa];
  if (!cfg || cfg.diasMax === 0) return null;
  return cfg.diasMax - diasNaEtapa(etapaChangedAt);
}
