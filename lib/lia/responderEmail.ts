/**
 * Lia lê e responde e-mails. Entra pelo webhook da Resend (resposta a um e-mail automático da Lia, identificado
 * pelo endereço rastreável lia+<envioId>@...). Sempre avisa a unidade; só responde sozinha com a flag
 * LIA_RESPOSTA_EMAIL_ATIVA=true e dentro das travas (sem auto-resposta, sem assunto sensível, máx. 3/semana).
 */
import { prisma } from "@/lib/prisma";
import { sendMail, getApiKey } from "@/lib/email";
import { callAIChat } from "@/lib/aiService";
import { formatarBaseLegalParaPrompt } from "@/lib/lia/leiEstagio";
import { formatarConhecimentoSistemaParaPrompt } from "@/lib/lia/sistemaSmarter";
import { tokenOptOut } from "@/lib/automacao/token";
import { normalizarEmail } from "@/lib/automacao/regras";
import {
  templateLiaEmail, linksPorTipo, linkDoTopico, enderecoResposta, extrairEnvioId, esc, type Topico, type LinkUtil,
} from "@/lib/automacao/emailBrand";
import {
  limparTextoResposta, detectarOptOut, deveEscalar, ehAutoResposta, podeResponderAutomaticamente,
  assuntoResposta, emailDe, lerDecisaoIA,
} from "@/lib/lia/emailInbound";

const _raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
const APP_URL = _raw && !_raw.includes("localhost") && !_raw.includes("127.0.0") ? _raw.replace(/\/$/, "") : "https://sistema.smarterestagios.com.br";

export const respostaAutomaticaAtiva = () => process.env.LIA_RESPOSTA_EMAIL_ATIVA === "true";

const TOPICOS_VALIDOS: Topico[] = ["portal", "solicitar_vaga", "avaliacoes", "estagiarios", "documentos", "financeiro", "vagas", "curriculo", "candidaturas", "cadastro_estudante", "cadastro_empresa", "site"];
const LINK_PAINEL: Record<string, string> = {
  ASSINATURA: "/dashboard/contratos", RENOVACAO: "/dashboard/contratos", AVALIACAO: "/dashboard/contratos",
  CRM_FOLLOWUP: "/dashboard/crm", REATIVACAO: "/dashboard/empresas", PORTAL_ATIVACAO: "/dashboard/empresas",
  CONVITE_VAGA: "/dashboard/processos", ENTREVISTA_LEMBRETE: "/dashboard/processos",
};

export interface EventoRecebido { emailId: string; messageId?: string | null; from: string; to: string[]; subject?: string | null }

async function buscarConteudo(emailId: string): Promise<{ texto: string; headers: Record<string, string> } | null> {
  const key = await getApiKey();
  if (!key) return null;
  try {
    const r = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) { console.error("[lia-email] buscar conteúdo falhou:", r.status); return null; }
    const j: any = await r.json();
    const texto = j.text || String(j.html || "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
    return { texto: String(texto || ""), headers: j.headers && typeof j.headers === "object" ? j.headers : {} };
  } catch (e: any) { console.error("[lia-email] buscar conteúdo erro:", e?.message); return null; }
}

async function avisarUnidade(franchiseId: string | null, titulo: string, mensagem: string, link: string) {
  const usuarios = await prisma.user.findMany({
    where: franchiseId ? { franchiseId, role: "FRANQUEADO", active: true } : { role: "FRANQUEADORA", active: true },
    select: { id: true },
  });
  if (usuarios.length === 0) return;
  await prisma.notification.createMany({
    data: usuarios.map(u => ({ userId: u.id, titulo, mensagem: mensagem.slice(0, 500), tipo: "lia_email", link })),
  });
}

async function enviarResposta(p: { para: string; assunto: string; titulo: string; corpoHtml: string; links: LinkUtil[]; envioId: string; messageId?: string | null; tipoOriginal: string; franchiseId: string | null; detalhe: string }) {
  const optoutUrl = `${APP_URL}/optout?e=${encodeURIComponent(p.para)}&t=${tokenOptOut(p.para)}`;
  const html = templateLiaEmail({ titulo: p.titulo, corpo: p.corpoHtml, app: APP_URL, optoutUrl, links: p.links });
  const replyTo = enderecoResposta(process.env.LIA_EMAIL_RESPOSTAS, p.envioId);
  const headers = p.messageId ? { "In-Reply-To": p.messageId, References: p.messageId } : undefined;
  const ok = await sendMail(p.para, p.assunto, html, undefined, undefined, { ...(replyTo ? { replyTo } : {}), ...(headers ? { headers } : {}) });
  if (ok) {
    await prisma.automacaoEnvio.create({
      data: { tipo: "EMAIL_LIA_RESPOSTA", refId: p.envioId, destinatario: p.para, detalhe: p.detalhe.slice(0, 300), franchiseId: p.franchiseId },
    }).catch(() => {});
  }
  return ok;
}

const paragrafos = (t: string) => t.split(/\n{2,}/).map(x => `<p>${esc(x.trim()).replace(/\n/g, "<br/>")}</p>`).join("");

function promptEmail(contexto: "EMPRESA" | "ESTUDANTE", tipoOriginal: string) {
  return `Você é a Lia, assistente digital da Smarter Estágios, respondendo POR E-MAIL a ${contexto === "EMPRESA" ? "uma empresa" : "um estudante"} que respondeu a um aviso automático seu (tipo: ${tipoOriginal}).

REGRAS
- Português do Brasil, tom humano e cordial, direto ao ponto, no máximo 130 palavras, sem enrolação e sem repetir a pergunta. Não use markdown.
- Responda SOMENTE o que está coberto pelo conhecimento abaixo. Se não souber, se faltar dado, se pedir valores/preços/prazos específicos, negociar, ou se for algo pessoal/contratual/jurídico complexo: use acao "encaminhar" (a equipe da unidade assume).
- Nunca invente links, valores, datas, nem prometa nada em nome da unidade. Nunca peça senha, documentos pessoais ou dados bancários.
- Os links úteis são anexados automaticamente: escolha em "topicos" os que ajudam (valores possíveis: ${TOPICOS_VALIDOS.join(", ")}). Não escreva URLs no texto.
- Devolva APENAS um JSON: {"acao":"responder"|"encaminhar","resposta":"texto para o e-mail (parágrafos separados por linha em branco)","topicos":["..."]}

${formatarBaseLegalParaPrompt()}

${formatarConhecimentoSistemaParaPrompt()}`;
}

export async function processarRespostaEmail(ev: EventoRecebido): Promise<{ ok: boolean; motivo: string }> {
  const envioId = extrairEnvioId(ev.to);
  if (!envioId) return { ok: true, motivo: "sem_identificador" };
  const original = await prisma.automacaoEnvio.findUnique({ where: { id: envioId } });
  if (!original || original.tipo.startsWith("EMAIL_")) return { ok: true, motivo: "envio_desconhecido" };

  const chave = ev.messageId || ev.emailId;
  const jaFeito = await prisma.automacaoEnvio.findFirst({ where: { tipo: "EMAIL_RESPOSTA", refId: chave }, select: { id: true } });
  if (jaFeito) return { ok: true, motivo: "duplicado" };

  const remetente = emailDe(ev.from);
  const conteudo = await buscarConteudo(ev.emailId);
  const texto = limparTextoResposta(conteudo?.texto);
  const franchiseId = original.franchiseId ?? null;

  // Registra primeiro (deduplicação + contagem semanal) — mesmo se algo falhar depois, não repete.
  await prisma.automacaoEnvio.create({
    data: { tipo: "EMAIL_RESPOSTA", refId: chave, destinatario: remetente, canal: "email", detalhe: (texto || "(sem texto)").slice(0, 300), franchiseId },
  });

  if (ehAutoResposta({ de: remetente, assunto: ev.subject, headers: conteudo?.headers })) return { ok: true, motivo: "auto_resposta" };
  if (!texto) return { ok: true, motivo: "sem_texto" };

  // 1) A unidade sempre fica sabendo (sino) e o CRM guarda a resposta
  const painel = LINK_PAINEL[original.tipo] || "/dashboard";
  await avisarUnidade(franchiseId, "📩 Resposta a um e-mail da Lia", `${remetente}: ${texto}`, painel);
  if (original.tipo === "CRM_FOLLOWUP") {
    await prisma.crmNota.create({ data: { leadId: original.refId, tipo: "email", texto: `📩 Respondeu por e-mail: ${texto.slice(0, 600)}` } }).catch(() => {});
  }

  // 2) Descadastro: atende na hora (LGPD), mesmo com a resposta automática desligada
  if (detectarOptOut(texto)) {
    const email = normalizarEmail(remetente);
    await prisma.contatoOptOut.upsert({ where: { email }, create: { email, motivo: "pediu por e-mail" }, update: {} });
    if (respostaAutomaticaAtiva()) {
      await enviarResposta({ para: remetente, assunto: assuntoResposta(ev.subject), titulo: "Pronto, atendido", corpoHtml: "<p>Tudo certo: você não receberá mais avisos automáticos da Lia. Se mudar de ideia ou precisar de algo, é só falar com a equipe da sua unidade.</p>", links: [], envioId, messageId: ev.messageId, tipoOriginal: original.tipo, franchiseId, detalhe: "Confirmação de descadastro" });
    }
    return { ok: true, motivo: "descadastrado" };
  }

  if (!respostaAutomaticaAtiva()) return { ok: true, motivo: "resposta_automatica_desligada" };

  // 3) Travas: remetente igual ao destinatário original, limite semanal, assunto sensível
  const semana = new Date(Date.now() - 7 * 86_400_000);
  const respostasRecentes = await prisma.automacaoEnvio.count({ where: { tipo: "EMAIL_LIA_RESPOSTA", destinatario: remetente, createdAt: { gte: semana } } });
  const mesmoRemetente = normalizarEmail(original.destinatario) === normalizarEmail(remetente);
  const escalar = deveEscalar(texto) || !mesmoRemetente || !podeResponderAutomaticamente(respostasRecentes);

  const confirmarEncaminhamento = () => enviarResposta({
    para: remetente, assunto: assuntoResposta(ev.subject), titulo: "Recebemos sua mensagem",
    corpoHtml: "<p>Obrigada pela resposta! Esse assunto precisa de atenção da equipe da sua unidade — já avisei por aqui e eles retornam em breve.</p>",
    links: [], envioId, messageId: ev.messageId, tipoOriginal: original.tipo, franchiseId, detalhe: "Encaminhado à unidade",
  });
  if (escalar) { if (mesmoRemetente && podeResponderAutomaticamente(respostasRecentes)) await confirmarEncaminhamento(); return { ok: true, motivo: "encaminhado_regra" }; }

  // 4) IA decide: responder ou encaminhar
  const estudante = ["CONVITE_VAGA", "ENTREVISTA_LEMBRETE"].includes(original.tipo)
    || (original.tipo === "ASSINATURA" && !!(await prisma.student.findFirst({ where: { email: remetente }, select: { id: true } })));
  let decisao: ReturnType<typeof lerDecisaoIA> = null;
  try {
    const r = await callAIChat({
      franchiseId: franchiseId || "FRANQUEADORA", tipoUso: "lia_email",
      systemPrompt: promptEmail(estudante ? "ESTUDANTE" : "EMPRESA", original.tipo),
      messages: [{ role: "user", content: `Assunto original: ${ev.subject || "(sem assunto)"}\n\nMensagem recebida:\n${texto}` }],
      maxTokens: 500, temperature: 0.4,
    });
    decisao = lerDecisaoIA(r.content);
  } catch (e: any) { console.error("[lia-email] IA falhou:", e?.message); }

  if (!decisao || decisao.acao === "encaminhar" || !decisao.resposta.trim()) {
    await confirmarEncaminhamento();
    return { ok: true, motivo: "encaminhado_ia" };
  }
  const extras = decisao.topicos.filter((t): t is Topico => (TOPICOS_VALIDOS as string[]).includes(t));
  const links = [...extras.map(t => linkDoTopico(t, APP_URL))];
  const vistos = new Set<string>();
  const unicos = links.filter(l => (vistos.has(l.href) ? false : (vistos.add(l.href), true)));
  await enviarResposta({
    para: remetente, assunto: assuntoResposta(ev.subject), titulo: "Sobre a sua mensagem", corpoHtml: paragrafos(decisao.resposta),
    links: unicos.length ? unicos : linksPorTipo(original.tipo, APP_URL), envioId, messageId: ev.messageId, tipoOriginal: original.tipo, franchiseId, detalhe: `IA respondeu: ${decisao.resposta.slice(0, 120)}`,
  });
  return { ok: true, motivo: "respondido" };
}
