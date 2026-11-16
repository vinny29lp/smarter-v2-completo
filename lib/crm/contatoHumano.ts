/**
 * Contato humano com empresas trazidas pelo Sales (Victor): o Sales busca e a Lia manda o e-mail de apresentação;
 * o FRANQUEADO faz o contato humano (WhatsApp ou ligação). Funções puras (sem "@/"), testáveis no vitest.
 */
export const MARCADOR_CONTATO_HUMANO = "👤 Contato humano";
export const TEXTO_CONTATO_HUMANO = `${MARCADOR_CONTATO_HUMANO}: ligue ou envie WhatsApp com o link da apresentação`;

/** Prazo (dias) para o franqueado fazer o contato antes de virar "atrasado" na Central de Ações. */
export const PRAZO_CONTATO_HUMANO_DIAS = 2;

export const pendenteContatoHumano = (proximaAcao?: string | null) => !!proximaAcao && proximaAcao.startsWith(MARCADOR_CONTATO_HUMANO);

const soDigitos = (t?: string | null) => String(t || "").replace(/\D/g, "");

/** Número para wa.me: DDI 55 + DDD + número (10–11 dígitos). null se inválido. */
export function telefoneWa(t?: string | null): string | null {
  let d = soDigitos(t);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 && d.length <= 13 ? d : null;
}

export function linkApresentacao(appUrl: string, franchiseId?: string | null): string {
  return `${appUrl.replace(/\/$/, "")}/parceria${franchiseId ? `?ref=${franchiseId}` : ""}`;
}

export function mensagemWhatsApp(p: { contato?: string | null; empresa: string; unidade: string; responsavel: string; link: string }): string {
  const nome = (p.contato || "").trim().split(" ")[0];
  return `Olá${nome ? ", " + nome : ""}! Aqui é ${p.responsavel.split(" ")[0]}, da ${p.unidade}. Enviei um e-mail para a ${p.empresa} sobre contratação de estagiários, com a Smarter cuidando de todo o contrato e do acompanhamento. Preparei uma apresentação rápida para vocês: ${p.link} — posso tirar suas dúvidas?`;
}

export function linkWhatsApp(telefone: string | null | undefined, mensagem: string): string | null {
  const n = telefoneWa(telefone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}` : null;
}
