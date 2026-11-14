/**
 * Encaminha a resposta de um lead/empresa para o responsável certo:
 *  - a unidade dona do contato (franqueado: sino + e-mail para o e-mail do franqueado e da unidade);
 *  - a franqueadora (sino) — sempre ciente;
 *  - sem unidade (Matriz/rede): só a franqueadora, com sino + e-mail.
 * Nunca notifica outra unidade.
 */
import { prisma } from "@/lib/prisma";
import { sendMail, baseInterno } from "@/lib/email";
import { esc } from "@/lib/automacao/emailBrand";

const _raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
const APP_URL = _raw && !_raw.includes("localhost") && !_raw.includes("127.0.0") ? _raw.replace(/\/$/, "") : "https://sistema.smarterestagios.com.br";

/** "__rede__", vazio ou nulo = sem unidade. */
export function unidadeValida(id?: string | null): string | null {
  return id && id !== "__rede__" && id !== "MATRIZ" ? id : null;
}

export async function avisarResposta(p: {
  franchiseId?: string | null;
  titulo: string;
  de: string;
  mensagem: string;
  link: string;
  contexto: string; // ex.: "Follow-up do CRM", "WhatsApp (Sales Rep)"
}): Promise<{ unidade: boolean; franqueadora: boolean; emails: number }> {
  const fid = unidadeValida(p.franchiseId);
  const [donos, rede, franquia] = await Promise.all([
    fid ? prisma.user.findMany({ where: { franchiseId: fid, role: "FRANQUEADO", active: true }, select: { id: true, email: true } }) : Promise.resolve([]),
    prisma.user.findMany({ where: { role: "FRANQUEADORA", active: true }, select: { id: true, email: true } }),
    fid ? prisma.franchise.findUnique({ where: { id: fid }, select: { email: true } }) : Promise.resolve(null),
  ]);

  const destinatarios = [...donos, ...rede];
  if (destinatarios.length) {
    await prisma.notification.createMany({
      data: destinatarios.map(u => ({ userId: u.id, titulo: p.titulo, mensagem: `${p.de}: ${p.mensagem}`.slice(0, 500), tipo: "lia_email", link: p.link })),
    });
  }

  // E-mail: unidade dona; sem unidade, a franqueadora (para ninguém ficar sem retorno).
  const alvo = fid ? [...donos.map(u => u.email), franquia?.email] : rede.map(u => u.email);
  const emails = [...new Set(alvo.filter((e): e is string => !!e && /@/.test(e)).map(e => e.trim().toLowerCase()))];
  const corpo = `<p style="margin:0 0 8px"><strong>${esc(p.contexto)}</strong></p>
<p style="margin:0 0 4px"><strong>De:</strong> ${esc(p.de)}</p>
<p style="margin:0 0 12px;white-space:pre-wrap">${esc(p.mensagem.slice(0, 1200))}</p>
<p style="margin:12px 0 0">Responder no sistema: <a href="${APP_URL}${p.link}" style="color:#0f2a5e">${APP_URL}${p.link}</a></p>`;
  let enviados = 0;
  for (const e of emails) {
    if (await sendMail(e, `Resposta recebida: ${p.de}`, baseInterno("Resposta de contato", corpo)).catch(() => false)) enviados++;
  }
  return { unidade: donos.length > 0, franqueadora: rede.length > 0, emails: enviados };
}
