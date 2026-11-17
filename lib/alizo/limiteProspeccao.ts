/**
 * Trava de custo do Sales: não adianta buscar empresas novas se a unidade não trabalha as que já estão no CRM.
 * - "Pendente" = lead captado pelo Sales (google_maps) que a unidade ainda não tratou: situação ativa, sem venda,
 *   sem reunião marcada e ainda com a tarefa "👤 Contato humano" aberta. Ao contatar, agendar, marcar como sem
 *   interesse (perdido) ou vender, o lead deixa de ser pendente.
 * - Com 60 pendentes a busca PAUSA; só volta quando a unidade tratar pelo menos 40 deles desde a pausa.
 * Funções puras (sem "@/"), testáveis no vitest.
 */
export const LIMITE_PENDENTES = 60;
export const TRATAR_PARA_RETOMAR = 40;

export const TIPO_PAUSA = "ALIZO_PROSPECCAO_PAUSA";
export const TIPO_RETOMADA = "ALIZO_PROSPECCAO_RETOMADA";

export type EstadoPausa = { pendentesNaPausa: number } | null;
export type DecisaoProspeccao =
  | { acao: "liberada" }
  | { acao: "pausar"; pendentes: number }
  | { acao: "retomar"; pendentes: number }
  | { acao: "bloqueada"; pendentes: number; faltamTratar: number };

export function decidirProspeccao(pendentes: number, pausa: EstadoPausa): DecisaoProspeccao {
  if (pausa) {
    const alvo = pausa.pendentesNaPausa - TRATAR_PARA_RETOMAR;
    if (pendentes <= alvo) return { acao: "retomar", pendentes };
    return { acao: "bloqueada", pendentes, faltamTratar: pendentes - alvo };
  }
  if (pendentes >= LIMITE_PENDENTES) return { acao: "pausar", pendentes };
  return { acao: "liberada" };
}

export const detalhePausa = (pendentes: number) => `pendentes=${pendentes}`;
export function pendentesDoDetalhe(detalhe?: string | null): number {
  const m = /pendentes=(\d+)/.exec(detalhe || "");
  return m ? Number(m[1]) : LIMITE_PENDENTES;
}

/** Estado vigente a partir do último registro de pausa/retomada da unidade (mais recente primeiro). */
export function estadoPausa(ultimo: { tipo: string; detalhe?: string | null } | null | undefined): EstadoPausa {
  return ultimo && ultimo.tipo === TIPO_PAUSA ? { pendentesNaPausa: pendentesDoDetalhe(ultimo.detalhe) } : null;
}

export function textoLembreteSales(pendentes: number, pausada: boolean): { titulo: string; mensagem: string } {
  const base = `O Sales buscou empresas da sua região e ${pendentes} delas estão no seu CRM esperando o seu contato (ligar ou mandar WhatsApp). A Lia já enviou o e-mail de apresentação.`;
  return {
    titulo: "📞 Empresas esperando o seu contato",
    mensagem: pausada
      ? `${base} A busca de novas empresas está pausada até você tratar pelo menos ${TRATAR_PARA_RETOMAR} (contatar, marcar reunião, marcar sem interesse ou vender). Abra a Central de Ações.`
      : `${base} Abra a Central de Ações para ver a mensagem pronta de cada uma.`,
  };
}
