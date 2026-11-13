/**
 * #15 — Diagnóstico de contrato travado. Função pura (sem "@/"): recebe o contrato e seus
 * documentos e devolve em que ponto do fluxo ele parou e qual é a próxima ação.
 */
export type EtapaTravada =
  | "SEM_TCE"            // TCE ainda não foi gerado
  | "TCE_NAO_ENVIADO"    // TCE gerado, mas nunca enviado para assinatura
  | "AGUARDANDO_ASSINATURA"
  | "ASSINADO_NAO_ATIVADO" // todos assinaram, mas o contrato não virou ATIVO
  | "ATIVO_VENCIDO";     // data final passou e o contrato continua ativo

export interface DocResumo {
  tipo: string;
  status: string | null;
  signers?: any;
}
export interface ContratoResumo {
  status: string | null;
  createdAt: Date | null;
  dataFim: Date;
}
export interface Diagnostico {
  etapa: EtapaTravada;
  dias: number;
  titulo: string;
  proximaAcao: string;
  faltamAssinar: string[];
}

const DIA = 86_400_000;
export const DIAS_MINIMO_TRAVADO = 3;

export function nomesQueFaltamAssinar(signers: any): string[] {
  if (!Array.isArray(signers)) return [];
  return signers
    .filter((s: any) => s && !s.signed && !s.rejected && !s.assinado)
    .map((s: any) => String(s.label || s.name || s.nome || s.email || "").trim())
    .filter(Boolean);
}

export function diagnosticarContrato(c: ContratoResumo, docs: DocResumo[], agora = new Date()): Diagnostico | null {
  const diasCriado = c.createdAt ? Math.floor((agora.getTime() - c.createdAt.getTime()) / DIA) : 0;

  if (c.status === "ATIVO") {
    if (c.dataFim.getTime() < agora.getTime()) {
      return {
        etapa: "ATIVO_VENCIDO",
        dias: Math.floor((agora.getTime() - c.dataFim.getTime()) / DIA),
        titulo: "Estágio terminou e o contrato continua ativo",
        proximaAcao: "Renove com termo aditivo ou finalize o contrato.",
        faltamAssinar: [],
      };
    }
    return null;
  }
  if (c.status !== "PENDENTE" && c.status !== "AGUARDANDO_ASSINATURA") return null;
  if (diasCriado < DIAS_MINIMO_TRAVADO) return null;

  const tce = docs.find(d => d.tipo === "tce");
  const st = tce?.status || "NAO_GERADO";

  if (st === "ASSINADO") {
    return {
      etapa: "ASSINADO_NAO_ATIVADO", dias: diasCriado,
      titulo: "TCE assinado, mas o contrato não foi ativado",
      proximaAcao: "Abra o TCE e sincronize as assinaturas para ativar o estágio.",
      faltamAssinar: [],
    };
  }
  if (st === "ENVIADO_ASSINATURA" || st === "AGUARDANDO_ASSINATURA") {
    return {
      etapa: "AGUARDANDO_ASSINATURA", dias: diasCriado,
      titulo: "Aguardando assinatura",
      proximaAcao: "Cobre quem ainda não assinou (a Lia já lembra por e-mail).",
      faltamAssinar: nomesQueFaltamAssinar(tce?.signers),
    };
  }
  if (st === "GERADO") {
    return {
      etapa: "TCE_NAO_ENVIADO", dias: diasCriado,
      titulo: "TCE gerado, mas não enviado para assinatura",
      proximaAcao: "Envie o TCE para assinatura.",
      faltamAssinar: [],
    };
  }
  return {
    etapa: "SEM_TCE", dias: diasCriado,
    titulo: "TCE ainda não foi gerado",
    proximaAcao: "Gere o TCE e envie para assinatura.",
    faltamAssinar: [],
  };
}
