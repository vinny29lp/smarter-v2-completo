/**
 * Motor das automações da Lia — roda todo dia pelo cron /api/cron/lia-automacoes.
 *  #14 lembrete de assinatura pendente (por signatário, via link do Autentique)
 *  #17 pipeline de renovação 90/60/30 dias (e-mail à empresa + aviso à unidade)
 *  #19 avaliações automáticas aos 30/90/180 dias (e-mail à empresa com o link)
 *
 * Garantias: cada envio é registrado em automacao_envios (sem repetição), respeita o opt-out
 * de LGPD, tem teto por execução e `dryRun` não envia nem grava nada.
 */
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { buscarStatusAutentique } from "@/lib/autentique";
import { tokenOptOut, tokenRelatorio } from "./token";
import { convenioDevido, relatorioSemestralDevido, periodoSemestre } from "./iesRegras";
import { randomUUID, randomBytes } from "crypto";
import { esc, botao, templateLiaEmail, linksPorTipo, enderecoResposta, remetenteLia, htmlParaTexto, type Topico } from "./emailBrand";
import { proximoFollowup, mensagemFollowup, ETAPAS_FOLLOWUP, LIMITE_DIARIO_UNIDADE, MAX_FOLLOWUPS } from "./crmFollowup";
import { reativacaoDevida, ativacaoPortalDevida, vagaPrecisaShortlist, lembreteEntrevistaDevido, MAX_REATIVACOES, MAX_AVISOS_PORTAL, MAX_CONVITES_ESTUDANTE_SEMANA, SCORE_MINIMO_CONVITE, TAMANHO_SHORTLIST } from "./engajamento";
import { rankear } from "@/lib/matching/matching";
import { semestralDevida, marcoFim, limiteDoisAnosAcumulado, pesquisaDevida, vagaParadaDevida, retornoEmpresaDevido, COBRANCA_ESCALA_UNIDADE, MAX_COBRANCAS_SEMESTRAL } from "./cicloRegras";
import {
  diasEntre, marcoRenovacao, marcoAvaliacao, limiteDeDoisAnos,
  deveLembrarAssinatura, normalizarEmail, emailValido, MAX_LEMBRETES_ASSINATURA, IDADE_MAX_DOC_DIAS,
} from "./regras";

export const TETO_ENVIOS_POR_EXECUCAO = 120;
const MAX_DOCS_AUTENTIQUE_POR_EXECUCAO = 40;

const _raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
const APP_URL = _raw && !_raw.includes("localhost") && !_raw.includes("127.0.0")
  ? _raw.replace(/\/$/, "")
  : "https://sistema.smarterestagios.com.br";

const APP = APP_URL;

function templateEmail(titulo: string, corpo: string, email: string, tipo: string, extras: Topico[] = []): string {
  const optoutUrl = `${APP_URL}/optout?e=${encodeURIComponent(email)}&t=${tokenOptOut(email)}`;
  return templateLiaEmail({ titulo, corpo, app: APP_URL, optoutUrl, links: linksPorTipo(tipo, APP_URL, extras) });
}

export interface Resultado {
  candidatos: number;
  enviados: number;
  optOut: number;
  semEmail: number;
  falhas: number;
  amostra: string[];
}
const novoResultado = (): Resultado => ({ candidatos: 0, enviados: 0, optOut: 0, semEmail: 0, falhas: 0, amostra: [] });

interface Ctx {
  dryRun: boolean;
  agora: Date;
  restante: { n: number };
  optOut: Set<string>;
  vistos: Set<string>;
  porUnidade: Map<string, Record<Contador, number>>;
}

type Contador = "renovacao" | "avaliacao" | "assinatura" | "crm" | "reativacao" | "portal" | "convite" | "entrevista" | "convenio" | "relatorio" | "semestral" | "fim" | "pesquisa" | "vaga";
const zerados = (): Record<Contador, number> => ({ renovacao: 0, avaliacao: 0, assinatura: 0, crm: 0, reativacao: 0, portal: 0, convite: 0, entrevista: 0, convenio: 0, relatorio: 0, semestral: 0, fim: 0, pesquisa: 0, vaga: 0 });

function contar(ctx: Ctx, franchiseId: string, k: Contador) {
  const c = ctx.porUnidade.get(franchiseId) || zerados();
  c[k] += 1;
  ctx.porUnidade.set(franchiseId, c);
}

async function enviar(ctx: Ctx, r: Resultado, p: {
  tipo: string; refId: string; para: string | null | undefined; assunto: string; titulo: string;
  corpo: string; detalhe: string; franchiseId: string; contador: Contador;
}): Promise<boolean> {
  r.candidatos++;
  const email = normalizarEmail(p.para);
  if (!emailValido(email)) { r.semEmail++; return false; }
  if (ctx.optOut.has(email)) { r.optOut++; return false; }
  // Cadastros duplicados (mesmo estágio/documento lançado 2x) não podem gerar 2 e-mails para a mesma pessoa.
  // O duplicado é registrado como "coberto" (sem enviar) para manter a cadência sincronizada.
  const chave = `${p.tipo}|${email}|${p.detalhe.replace(/\(lembrete \d+\/\d+\)/, "")}`;
  if (ctx.vistos.has(chave)) {
    if (!ctx.dryRun) {
      await prisma.automacaoEnvio.create({
        data: { tipo: p.tipo, refId: p.refId, destinatario: email, detalhe: ("duplicado — " + p.detalhe).slice(0, 300) },
      }).catch(() => {});
    }
    return false;
  }
  if (ctx.restante.n <= 0) return false;
  ctx.vistos.add(chave);
  if (r.amostra.length < 8) r.amostra.push(p.detalhe);
  if (ctx.dryRun) { ctx.restante.n--; r.enviados++; return true; }

  const envioId = randomUUID();
  const replyTo = enderecoResposta(process.env.LIA_EMAIL_RESPOSTAS, envioId);
  const html = templateEmail(p.titulo, p.corpo, email, p.tipo);
  const ok = await sendMail(email, p.assunto, html, undefined, remetenteLia(), { text: htmlParaTexto(html), ...(replyTo ? { replyTo } : {}) });
  if (!ok) { r.falhas++; return false; }
  ctx.restante.n--;
  r.enviados++;
  contar(ctx, p.franchiseId, p.contador);
  await prisma.automacaoEnvio.create({
    data: { id: envioId, tipo: p.tipo, refId: p.refId, destinatario: email, detalhe: p.detalhe.slice(0, 300), franchiseId: p.franchiseId },
  }).catch(e => console.error("[lia] falha ao registrar envio:", e?.message));
  return true;
}

// ───────────────────────────── #14 Assinaturas pendentes ─────────────────────────────
async function lembretesAssinatura(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const desde = new Date(ctx.agora.getTime() - IDADE_MAX_DOC_DIAS * 86_400_000);
  const docs = await prisma.internshipDocument.findMany({
    where: {
      status: { in: ["ENVIADO_ASSINATURA", "AGUARDANDO_ASSINATURA"] },
      authDocId: { not: null },
      createdAt: { gte: desde },
      contract: { status: { not: "FINALIZADO" } },
    },
    select: {
      id: true, titulo: true, authDocId: true, createdAt: true,
      contract: { select: { franchiseId: true, student: { select: { name: true } }, company: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  });
  if (docs.length === 0) return r;

  const logs = await prisma.automacaoEnvio.findMany({
    where: { tipo: "ASSINATURA", refId: { in: docs.map(d => d.id) } },
    select: { refId: true, destinatario: true, createdAt: true },
  });
  const porDoc = new Map<string, typeof logs>();
  for (const l of logs) porDoc.set(l.refId, [...(porDoc.get(l.refId) || []), l]);

  let consultas = 0;
  for (const d of docs) {
    if (consultas >= MAX_DOCS_AUTENTIQUE_POR_EXECUCAO || ctx.restante.n <= 0) break;
    const idade = diasEntre(d.createdAt || ctx.agora, ctx.agora);
    const dl = porDoc.get(d.id) || [];
    const ultimoDoc = dl.length ? Math.max(...dl.map(l => l.createdAt.getTime())) : null;
    if (idade < 2) continue;
    if (ultimoDoc !== null && diasEntre(new Date(ultimoDoc), ctx.agora) < 3) continue;

    consultas++;
    let status;
    try { status = await buscarStatusAutentique(d.authDocId as string); }
    catch (e: any) { console.error("[lia] autentique:", e?.message); r.falhas++; continue; }
    if (status.allSigned) continue;

    for (const s of status.signers) {
      if (s.signed || s.rejected || !s.link) continue;
      const email = normalizarEmail(s.email);
      const meus = dl.filter(l => l.destinatario === email);
      const ultimo = meus.length ? Math.max(...meus.map(l => l.createdAt.getTime())) : null;
      if (!deveLembrarAssinatura({
        idadeDocDias: idade,
        lembretesAnteriores: meus.length,
        diasDesdeUltimoLembrete: ultimo === null ? null : diasEntre(new Date(ultimo), ctx.agora),
      })) continue;

      const aluno = d.contract.student?.name || "o(a) estagiário(a)";
      const empresa = d.contract.company?.name || "a empresa";
      await enviar(ctx, r, {
        tipo: "ASSINATURA", refId: d.id, para: email,
        assunto: `Falta sua assinatura — ${d.titulo || "documento do estágio"}`,
        titulo: "Falta só a sua assinatura",
        corpo: `<p>Olá${s.name ? `, <strong>${esc(s.name)}</strong>` : ""}!</p>
<p>O documento <strong>${esc(d.titulo || "do estágio")}</strong> (estágio de <strong>${esc(aluno)}</strong> na <strong>${esc(empresa)}</strong>) ainda aguarda a sua assinatura. Leva menos de 1 minuto e pode ser feita pelo celular.</p>
${botao(s.link, "Assinar agora")}
<p style="color:#64748b;font-size:12px">Enquanto falta uma assinatura, o estágio não pode começar oficialmente.</p>`,
        detalhe: `Assinatura pendente: ${d.titulo} — ${aluno} (lembrete ${meus.length + 1}/${MAX_LEMBRETES_ASSINATURA})`,
        franchiseId: d.contract.franchiseId, contador: "assinatura",
      });
    }
  }
  return r;
}


/** Início do primeiro estágio do mesmo estudante na mesma empresa (o limite de 2 anos soma contratos seguidos). */
async function primeirosInicios(contratos: { studentId: string; companyId: string; dataInicio: Date }[]): Promise<Map<string, Date>> {
  const m = new Map<string, Date>();
  if (contratos.length === 0) return m;
  const todos = await prisma.contract.findMany({
    where: {
      studentId: { in: Array.from(new Set(contratos.map(c => c.studentId))) },
      companyId: { in: Array.from(new Set(contratos.map(c => c.companyId))) },
      status: { in: ["ATIVO", "VENCIDO", "FINALIZADO", "SUSPENSO"] },
    },
    select: { studentId: true, companyId: true, dataInicio: true },
  });
  for (const t of [...todos, ...contratos]) {
    const k = `${t.studentId}:${t.companyId}`;
    const a = m.get(k);
    if (!a || t.dataInicio < a) m.set(k, t.dataInicio);
  }
  return m;
}

/** Avisa a unidade (painel) uma única vez por situação. */
async function avisarUnidadeUmaVez(ctx: Ctx, p: { franchiseId: string; refId: string; tipo: string; titulo: string; mensagem: string; link: string }) {
  if (ctx.dryRun) return;
  const ja = await prisma.automacaoEnvio.count({ where: { tipo: p.tipo, refId: p.refId } });
  if (ja > 0) return;
  const usuarios = await prisma.user.findMany({ where: { franchiseId: p.franchiseId, role: "FRANQUEADO", active: true }, select: { id: true } });
  if (usuarios.length > 0) {
    await prisma.notification.createMany({
      data: usuarios.map(u => ({ userId: u.id, titulo: p.titulo, mensagem: p.mensagem, tipo: "lia_automacao", link: p.link })),
    }).catch(() => {});
  }
  await prisma.automacaoEnvio.create({
    data: { tipo: p.tipo, refId: p.refId, destinatario: "unidade", canal: "interno", detalhe: p.titulo.slice(0, 300), franchiseId: p.franchiseId },
  }).catch(() => {});
}

// ───────────────────────────── #17 Renovação 90/60/30 ─────────────────────────────
async function renovacoes(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const contratos = await prisma.contract.findMany({
    where: { status: "ATIVO", dataFim: { gte: ctx.agora, lte: new Date(ctx.agora.getTime() + 91 * 86_400_000) } },
    select: {
      id: true, dataInicio: true, dataFim: true, franchiseId: true, studentId: true, companyId: true,
      company: { select: { name: true, email: true } },
      student: { select: { name: true } },
      franchise: { select: { name: true, email: true, telefone: true } },
    },
    orderBy: { dataFim: "asc" },
    take: 400,
  });
  const inicios = await primeirosInicios(contratos);
  const marcos = new Map<string, number>();
  for (const c of contratos) {
    const m = marcoRenovacao(Math.ceil((c.dataFim.getTime() - ctx.agora.getTime()) / 86_400_000));
    if (m !== null) marcos.set(c.id, m);
  }
  if (marcos.size === 0) return r;
  const feitos = new Set(
    (await prisma.automacaoEnvio.findMany({
      where: { tipo: "RENOVACAO", refId: { in: Array.from(marcos.entries()).map(([id, m]) => `${id}:${m}`) } },
      select: { refId: true },
    })).map(x => x.refId),
  );

  for (const c of contratos) {
    const m = marcos.get(c.id);
    if (m === undefined || feitos.has(`${c.id}:${m}`)) continue;
    if (ctx.restante.n <= 0) break;
    const fim = c.dataFim.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    const aluno = c.student?.name || "o(a) estagiário(a)";
    const efetivar = limiteDeDoisAnos(c.dataInicio, c.dataFim) || limiteDoisAnosAcumulado(inicios.get(`${c.studentId}:${c.companyId}`) || c.dataInicio, c.dataFim).noLimite;
    const contato = [c.franchise?.name, c.franchise?.telefone, c.franchise?.email].filter(Boolean).map(x => esc(String(x))).join(" · ");
    const corpo = efetivar
      ? `<p>Olá, <strong>${esc(c.company?.name || "")}</strong>!</p>
<p>O estágio de <strong>${esc(aluno)}</strong> termina em <strong>${fim}</strong> (faltam cerca de ${m} dias) e já chega ao limite de 2 anos previsto na Lei do Estágio, então não pode ser renovado na mesma empresa.</p>
<p>Se ${esc(aluno)} está indo bem, este é o momento ideal para pensar na <strong>efetivação</strong>. E, se quiser, abrimos uma nova vaga de estágio para dar continuidade ao trabalho com outro(a) estudante.</p>
<p>Fale com a sua unidade: ${contato}</p>`
      : `<p>Olá, <strong>${esc(c.company?.name || "")}</strong>!</p>
<p>O contrato de estágio de <strong>${esc(aluno)}</strong> termina em <strong>${fim}</strong> (faltam cerca de ${m} dias).</p>
<p>Para <strong>renovar sem interromper</strong> as atividades, é só falar com a sua unidade, que cuida de toda a documentação (termo aditivo). Se preferir encerrar ou abrir uma nova vaga, também resolvemos.</p>
<p>Fale com a sua unidade: ${contato}</p>`;
    await enviar(ctx, r, {
      tipo: "RENOVACAO", refId: `${c.id}:${m}`, para: c.company?.email,
      assunto: efetivar ? `Estágio de ${aluno} chega ao limite de 2 anos` : `Renovação do estágio de ${aluno} — termina em ${fim}`,
      titulo: efetivar ? "Estágio no limite de 2 anos" : "Renovação de estágio",
      corpo, detalhe: `Renovação ${m}d: ${aluno} (${c.company?.name}) termina ${fim}`,
      franchiseId: c.franchiseId, contador: "renovacao",
    });
  }
  return r;
}

// ───────────────────────────── #19 Avaliações 30/90/180 ─────────────────────────────
const ROTULO_AVALIACAO: Record<number, string> = {
  30: "Avaliação de experiência (30 dias)",
  90: "Avaliação de acompanhamento (90 dias)",
  180: "Avaliação semestral (180 dias)",
};

async function avaliacoes(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const contratos = await prisma.contract.findMany({
    where: {
      status: "ATIVO",
      dataInicio: { lte: new Date(ctx.agora.getTime() - 30 * 86_400_000), gte: new Date(ctx.agora.getTime() - 195 * 86_400_000) },
    },
    select: {
      id: true, dataInicio: true, franchiseId: true,
      company: { select: { name: true, email: true } },
      student: { select: { name: true } },
      evaluations: { where: { status: "respondido" }, select: { respondidoAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 500,
  });
  const marcos = new Map<string, number>();
  for (const c of contratos) {
    const m = marcoAvaliacao(diasEntre(c.dataInicio, ctx.agora));
    // O marco de 180 dias é coberto pela avaliação semestral recorrente (com cobrança até preencher).
    if (m !== null && m !== 180) marcos.set(c.id, m);
  }
  if (marcos.size === 0) return r;
  const feitos = new Set(
    (await prisma.automacaoEnvio.findMany({
      where: { tipo: "AVALIACAO", refId: { in: Array.from(marcos.entries()).map(([id, m]) => `${id}:${m}`) } },
      select: { refId: true },
    })).map(x => x.refId),
  );

  for (const c of contratos) {
    const m = marcos.get(c.id);
    if (m === undefined || feitos.has(`${c.id}:${m}`)) continue;
    if (ctx.restante.n <= 0) break;
    // Já avaliada nos últimos 20 dias (manual ou pela automação anterior): não incomoda a empresa de novo.
    const ultima = c.evaluations[0]?.respondidoAt;
    if (ultima && diasEntre(ultima, ctx.agora) < 20) continue;
    const aluno = c.student?.name || "o(a) estagiário(a)";
    const link = `${APP_URL}/portal-empresa/avaliacoes?contrato=${c.id}`;
    await enviar(ctx, r, {
      tipo: "AVALIACAO", refId: `${c.id}:${m}`, para: c.company?.email,
      assunto: `${ROTULO_AVALIACAO[m]} — ${aluno}`,
      titulo: ROTULO_AVALIACAO[m],
      corpo: `<p>Olá, <strong>${esc(c.company?.name || "")}</strong>!</p>
<p>O estágio de <strong>${esc(aluno)}</strong> completou <strong>${m} dias</strong>. Avaliar o desempenho neste ponto é parte do acompanhamento exigido pela <strong>Lei 11.788/2008</strong> e ajuda a corrigir a rota cedo.</p>
<p>São poucas perguntas (pontualidade, produtividade, iniciativa, comunicação, aprendizado e postura) e leva menos de 3 minutos.</p>
${botao(link, "Preencher avaliação")}
<p style="color:#64748b;font-size:12px">Se o botão não abrir, copie este link no navegador:<br/>${link}</p>`,
      detalhe: `Avaliação ${m}d: ${aluno} (${c.company?.name})`,
      franchiseId: c.franchiseId, contador: "avaliacao",
    });
  }
  return r;
}


// ───────────────────────────── #2 Follow-up automático do CRM ─────────────────────────────
async function followupsCrm(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const leads = await prisma.crmLead.findMany({
    where: {
      situacao: "ativo", convertido: false, optIn: true, email: { not: null },
      etapa: { in: [...ETAPAS_FOLLOWUP] },
    },
    select: {
      id: true, empresa: true, contato: true, email: true, etapa: true, franchiseId: true,
      etapaChangedAt: true, createdAt: true, ultimoContato: true,
      franchise: { select: { name: true } },
    },
    orderBy: { etapaChangedAt: "asc" },
    take: 600,
  });
  if (leads.length === 0) return r;

  const logs = await prisma.automacaoEnvio.findMany({
    where: { tipo: "CRM_FOLLOWUP", refId: { in: leads.map(l => l.id) } },
    select: { refId: true, createdAt: true },
  });
  const porLead = new Map<string, Date[]>();
  for (const l of logs) porLead.set(l.refId, [...(porLead.get(l.refId) || []), l.createdAt]);

  const enviadosPorUnidade = new Map<string, number>();
  for (const l of leads) {
    if (ctx.restante.n <= 0) break;
    const unidade = l.franchiseId || "__rede__";
    if ((enviadosPorUnidade.get(unidade) || 0) >= LIMITE_DIARIO_UNIDADE) continue;

    const naEtapaDesde = l.etapaChangedAt || l.createdAt || ctx.agora;
    // A sequência recomeça quando o lead muda de etapa.
    const meus = (porLead.get(l.id) || []).filter(d => d.getTime() >= naEtapaDesde.getTime());
    const ultimo = meus.length ? Math.max(...meus.map(d => d.getTime())) : null;
    // Contato humano recente: a Lia não atropela.
    if (l.ultimoContato && diasEntre(l.ultimoContato, ctx.agora) < 4) continue;

    const numero = proximoFollowup({
      etapa: l.etapa,
      diasNaEtapa: diasEntre(naEtapaDesde, ctx.agora),
      enviados: meus.length,
      diasDesdeUltimo: ultimo === null ? null : diasEntre(new Date(ultimo), ctx.agora),
    });
    if (numero === null) continue;

    const msg = mensagemFollowup(l.etapa as string, numero, { empresa: l.empresa, contato: l.contato, unidade: l.franchise?.name });
    const ok = await enviar(ctx, r, {
      tipo: "CRM_FOLLOWUP", refId: l.id, para: l.email,
      assunto: msg.assunto, titulo: msg.assunto, corpo: msg.corpo,
      detalhe: `Follow-up CRM ${numero}/${MAX_FOLLOWUPS}: ${l.empresa} (${l.etapa})`,
      franchiseId: unidade, contador: "crm",
    });
    if (!ok) continue;
    enviadosPorUnidade.set(unidade, (enviadosPorUnidade.get(unidade) || 0) + 1);
    if (ctx.dryRun) continue;

    await prisma.crmNota.create({
      data: { leadId: l.id, texto: `🤖 Follow-up automático da Lia enviado (${numero}/${MAX_FOLLOWUPS}): "${msg.assunto}"`, tipo: "email" },
    }).catch(() => {});
    const proximoRetorno = new Date(ctx.agora.getTime() + 4 * 86_400_000);
    await prisma.crmLead.update({ where: { id: l.id }, data: { retornoAt: proximoRetorno } }).catch(() => {});
    if (numero >= MAX_FOLLOWUPS) {
      await prisma.crmTask.create({
        data: {
          leadId: l.id, dueAt: ctx.agora,
          descricao: `[LIA] ${MAX_FOLLOWUPS} follow-ups sem resposta de ${l.empresa}. Ligue ou mande WhatsApp; se não houver interesse, marque como perdido.`,
        },
      }).catch(() => {});
    }
  }
  return r;
}

// ───────────────────────────── Aviso à unidade (sino) ─────────────────────────────
async function avisarUnidades(ctx: Ctx) {
  if (ctx.dryRun) return 0;
  let n = 0;
  for (const [franchiseId, c] of Array.from(ctx.porUnidade.entries())) {
    const partes: string[] = [];
    if (c.assinatura) partes.push(`${c.assinatura} lembrete(s) de assinatura`);
    if (c.renovacao) partes.push(`${c.renovacao} aviso(s) de renovação a empresas`);
    if (c.avaliacao) partes.push(`${c.avaliacao} pedido(s) de avaliação a empresas`);
    if (c.crm) partes.push(`${c.crm} follow-up(s) a empresas do seu CRM`);
    if (c.reativacao) partes.push(`${c.reativacao} convite(s) de reativação a empresas sem contrato`);
    if (c.portal) partes.push(`${c.portal} orientação(ões) de acesso ao portal da empresa`);
    if (c.convite) partes.push(`${c.convite} convite(s) a estudantes para vagas abertas`);
    if (c.convenio) partes.push(`${c.convenio} convite(s)/lembrete(s) de convênio a instituições de ensino`);
    if (c.relatorio) partes.push(`${c.relatorio} relatório(s) semestral(is) enviado(s) a instituições de ensino`);
    if (c.semestral) partes.push(`${c.semestral} cobrança(s) de avaliação semestral obrigatória a empresas`);
    if (c.fim) partes.push(`${c.fim} aviso(s) de fim de estágio / limite de 2 anos`);
    if (c.pesquisa) partes.push(`${c.pesquisa} pesquisa(s) de satisfação pós-estágio`);
    if (c.vaga) partes.push(`${c.vaga} aviso(s) a empresas sobre vagas paradas ou candidatos sem retorno`);
    if (c.entrevista) partes.push(`${c.entrevista} lembrete(s) de entrevista a estudantes`);
    if (partes.length === 0) continue;
    const usuarios = await prisma.user.findMany({ where: { franchiseId, role: "FRANQUEADO", active: true }, select: { id: true } });
    if (usuarios.length === 0) continue;
    await prisma.notification.createMany({
      data: usuarios.map(u => ({
        userId: u.id,
        titulo: "🤖 A Lia trabalhou por você hoje",
        mensagem: `Enviei ${partes.join(", ")}. Você não precisa fazer nada — acompanhe as respostas nos contratos.`,
        tipo: "lia_automacao",
        link: "/dashboard/contratos",
      })),
    });
    n++;
  }
  return n;
}


// ───────────────────────────── IES: convênio e relatório semestral ─────────────────────────────
const MAX_CONVENIO_POR_EXECUCAO = 8;
const MAX_RELATORIOS_POR_EXECUCAO = 20;

/** Unidade responsável pela IES: a que a convidou ou, senão, a que tem mais contratos com ela. */
function unidadeDaIES(i: { franchiseId: string | null }, contratos: { franchiseId: string }[]): string {
  if (i.franchiseId) return i.franchiseId;
  const cont = new Map<string, number>();
  for (const c of contratos) cont.set(c.franchiseId, (cont.get(c.franchiseId) || 0) + 1);
  return [...cont.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "__rede__";
}

async function conveniosIES(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const ies = await prisma.institution.findMany({
    where: { convenioStatus: "PENDENTE", email: { not: null } },
    select: {
      id: true, name: true, email: true, coordenador: true, token: true, franchiseId: true, conviteEnviadoEm: true,
      contracts: { select: { franchiseId: true, status: true } },
      _count: { select: { students: true } },
    },
    take: 400,
  });
  if (ies.length === 0) return r;
  const logs = await prisma.automacaoEnvio.findMany({
    where: { tipo: "CONVENIO_IES", refId: { in: ies.map(i => i.id) }, NOT: { detalhe: { startsWith: "duplicado" } } },
    select: { refId: true, createdAt: true },
  });
  const porIes = new Map<string, Date[]>();
  for (const l of logs) porIes.set(l.refId, [...(porIes.get(l.refId) || []), l.createdAt]);

  // Prioriza quem tem mais estágios ativos.
  const ordenadas = [...ies].sort((a, b) => b.contracts.filter(c => c.status === "ATIVO").length - a.contracts.filter(c => c.status === "ATIVO").length);
  let feitos = 0;
  for (const i of ordenadas) {
    if (feitos >= MAX_CONVENIO_POR_EXECUCAO || ctx.restante.n <= 0) break;
    const acao = convenioDevido({
      status: "PENDENTE", emailValido: emailValido(normalizarEmail(i.email)), temEstagios: i.contracts.length > 0 || i._count.students > 0,
      conviteEnviadoEm: i.conviteEnviadoEm, enviosLia: porIes.get(i.id) || [], agora: ctx.agora,
    });
    if (!acao) continue;
    const unidade = unidadeDaIES(i, i.contracts);
    let token = i.token;
    if (!token) {
      token = randomBytes(12).toString("hex");
      if (!ctx.dryRun) await prisma.institution.update({ where: { id: i.id }, data: { token, conviteEnviadoEm: i.conviteEnviadoEm ?? ctx.agora } });
    }
    const portalUrl = `${APP_URL}/ies/${token}`;
    const oi = i.coordenador ? `Olá, ${esc(i.coordenador.split(" ")[0])}!` : "Olá!";
    const corpo = acao === "convite"
      ? `<p>${oi}</p><p>Sou a Lia, assistente digital da Smarter Estágios. Alunos da <b>${esc(i.name)}</b> já fazem estágio por meio da Smarter, e um convênio formaliza essa parceria, sem nenhum custo para a instituição.</p><p>Dá para assinar online, em poucos minutos:</p>${botao(portalUrl, "Assinar o convênio")}<p>Se preferir tratar com a nossa equipe, é só responder este e-mail.</p>`
      : `<p>${oi}</p><p>Retomando: o convênio de estágio com a <b>${esc(i.name)}</b> ainda está pendente. Ficou alguma dúvida que eu possa esclarecer?</p>${botao(portalUrl, "Assinar o convênio")}<p>Se preferir, responda este e-mail e a nossa equipe fala com você.</p>`;
    const ok = await enviar(ctx, r, {
      tipo: "CONVENIO_IES", refId: i.id, para: i.email,
      assunto: acao === "convite" ? `Convênio de estágio — ${i.name}` : `Convênio de estágio pendente — ${i.name}`,
      titulo: "Convênio de estágio", corpo,
      detalhe: `${acao === "convite" ? "Convite" : "Lembrete"} de convênio — ${i.name}`,
      franchiseId: unidade, contador: "convenio",
    });
    if (ok) {
      feitos++;
      if (!ctx.dryRun && !i.conviteEnviadoEm) await prisma.institution.update({ where: { id: i.id }, data: { conviteEnviadoEm: ctx.agora } }).catch(() => {});
    }
  }
  return r;
}

async function relatoriosSemestraisIES(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const desde = new Date(ctx.agora.getTime() - 46 * 86_400_000);
  const avs = await prisma.evaluation.findMany({
    where: { tipo: "semestral", respondidoAt: { gte: desde }, contract: { institution: { email: { not: null } } } },
    select: {
      id: true, respondidoAt: true,
      contract: {
        select: {
          franchiseId: true,
          student: { select: { name: true, curso: true } },
          company: { select: { name: true } },
          institution: { select: { name: true, email: true, coordenador: true } },
        },
      },
    },
    orderBy: { respondidoAt: "asc" },
    take: 200,
  });
  if (avs.length === 0) return r;
  const enviados = await prisma.automacaoEnvio.findMany({
    where: { tipo: "RELATORIO_IES", refId: { in: avs.map(a => a.id) }, NOT: { detalhe: { startsWith: "duplicado" } } }, select: { refId: true },
  });
  const jaIds = new Set(enviados.map(e => e.refId));
  let feitos = 0;
  for (const a of avs) {
    if (feitos >= MAX_RELATORIOS_POR_EXECUCAO || ctx.restante.n <= 0) break;
    if (!relatorioSemestralDevido({ respondidoAt: a.respondidoAt, jaEnviado: jaIds.has(a.id), agora: ctx.agora })) continue;
    const ies = a.contract.institution!;
    const link = `${APP_URL}/api/public/ies/relatorio/${a.id}?t=${tokenRelatorio(a.id)}`;
    const periodo = periodoSemestre(a.respondidoAt!);
    const oi = ies.coordenador ? `Olá, ${esc(ies.coordenador.split(" ")[0])}!` : "Olá!";
    const corpo = `<p>${oi}</p><p>Em cumprimento ao art. 7º, IV, da Lei 11.788/2008, segue o relatório semestral de atividades do estágio de <b>${esc(a.contract.student.name)}</b>${a.contract.student.curso ? ` (${esc(a.contract.student.curso)})` : ""} na empresa <b>${esc(a.contract.company.name)}</b>, referente a ${periodo}.</p>${botao(link, "Abrir o relatório")}<p>A página abre pronta para impressão; é só salvar em PDF. Qualquer dúvida, responda este e-mail.</p>`;
    const ok = await enviar(ctx, r, {
      tipo: "RELATORIO_IES", refId: a.id, para: ies.email,
      assunto: `Relatório semestral de estágio — ${a.contract.student.name}`, titulo: "Relatório semestral de estágio", corpo,
      detalhe: `Relatório semestral ${periodo} — ${a.contract.student.name} → ${ies.name}`,
      franchiseId: a.contract.franchiseId, contador: "relatorio",
    });
    if (ok) feitos++;
  }
  return r;
}


// ───────────────────────────── #3 Reativação de empresas sem contrato ─────────────────────────────
const MAX_REATIVACOES_POR_EXECUCAO = 25;
async function reativarEmpresas(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const empresas = await prisma.company.findMany({
    where: {
      status: "ATIVA", OR: [{ pendente: false }, { pendente: null }], franchiseId: { not: null },
      contracts: { none: { status: { in: ["ATIVO", "PENDENTE", "AGUARDANDO_ASSINATURA"] } } },
      vacancies: { none: { status: "ABERTA" } },
    },
    select: { id: true, name: true, email: true, responsavel: true, franchiseId: true, createdAt: true },
    orderBy: { createdAt: "asc" }, take: 400,
  });
  if (empresas.length === 0) return r;
  const envios = await prisma.automacaoEnvio.findMany({
    where: { tipo: "REATIVACAO", refId: { in: empresas.map(e => e.id) }, NOT: { detalhe: { startsWith: "duplicado" } } },
    select: { refId: true, createdAt: true },
  });
  const porEmpresa = new Map<string, Date[]>();
  for (const e of envios) porEmpresa.set(e.refId, [...(porEmpresa.get(e.refId) || []), e.createdAt]);

  let feitos = 0;
  for (const e of empresas) {
    if (feitos >= MAX_REATIVACOES_POR_EXECUCAO || ctx.restante.n <= 0) break;
    if (!reativacaoDevida({ cadastradaEm: e.createdAt, envios: porEmpresa.get(e.id) || [], agora: ctx.agora })) continue;
    const n = (porEmpresa.get(e.id) || []).length + 1;
    const ok = await enviar(ctx, r, {
      tipo: "REATIVACAO", refId: e.id, para: e.email,
      assunto: `Estagiários na ${e.name}`,
      titulo: "Estagiários para a " + e.name,
      corpo: `<p>Olá${e.responsavel ? ", " + esc(e.responsavel.split(" ")[0]) : ""}!</p>
<p>A <b>${esc(e.name)}</b> pretende ter estagiários neste semestre?</p>
<p>Se sim, responda este e-mail com o curso e o horário que você procura que eu já separo candidatos. A Smarter cuida do contrato, do seguro e do acompanhamento.</p>`,
      detalhe: `Reativação ${n}/${MAX_REATIVACOES} — ${e.name}`, franchiseId: e.franchiseId!, contador: "reativacao",
    });
    if (ok) feitos++;
  }
  return r;
}

// ───────────────────────────── #5 Ativação do portal da empresa ─────────────────────────────
const MAX_AVISOS_PORTAL_POR_EXECUCAO = 25;
async function ativarPortalEmpresas(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const empresas = await prisma.company.findMany({
    where: { status: "ATIVA", franchiseId: { not: null }, contracts: { some: { status: "ATIVO" } }, users: { some: { role: "EMPRESA", active: true } } },
    select: {
      id: true, name: true, franchiseId: true,
      users: { where: { role: "EMPRESA", active: true }, select: { email: true, name: true, lastLoginAt: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
    take: 300,
  });
  const candidatas = empresas.filter(e => e.users.length > 0 && e.users.every(u => !u.lastLoginAt));
  if (candidatas.length === 0) return r;
  const envios = await prisma.automacaoEnvio.findMany({
    where: { tipo: "PORTAL_ATIVACAO", refId: { in: candidatas.map(e => e.id) }, NOT: { detalhe: { startsWith: "duplicado" } } },
    select: { refId: true, createdAt: true },
  });
  const porEmpresa = new Map<string, Date[]>();
  for (const e of envios) porEmpresa.set(e.refId, [...(porEmpresa.get(e.refId) || []), e.createdAt]);

  let feitos = 0;
  for (const e of candidatas) {
    if (feitos >= MAX_AVISOS_PORTAL_POR_EXECUCAO || ctx.restante.n <= 0) break;
    const u = e.users[0];
    if (!ativacaoPortalDevida({ usuarioCriadoEm: u.createdAt, nuncaEntrou: true, envios: porEmpresa.get(e.id) || [], agora: ctx.agora })) continue;
    const n = (porEmpresa.get(e.id) || []).length + 1;
    const ok = await enviar(ctx, r, {
      tipo: "PORTAL_ATIVACAO", refId: e.id, para: u.email,
      assunto: `Seu acesso ao portal da Smarter — ${e.name}`,
      titulo: "Portal da empresa " + e.name,
      corpo: `<p>Olá${u.name ? ", " + esc(u.name.split(" ")[0]) : ""}!</p>
<p>A <b>${esc(e.name)}</b> já tem estagiário ativo conosco e o seu acesso ao portal está liberado. Por lá você acompanha tudo em um só lugar:</p>
<ul><li>Documentos e contratos dos estagiários</li><li>Avaliações de desempenho (rápidas, direto no portal)</li><li>Financeiro e boletos</li></ul>
<p>Seu login é este e-mail (${esc(u.email)}). Se ainda não definiu a senha, use "Esqueci minha senha" na tela de entrada.</p>${botao(APP_URL + "/login", "Acessar o portal")}`,
      detalhe: `Ativação do portal ${n}/${MAX_AVISOS_PORTAL} — ${e.name}`, franchiseId: e.franchiseId!, contador: "portal",
    });
    if (ok) feitos++;
  }
  return r;
}

// ───────────────────────────── #8 Shortlist automática e convite a estudantes ─────────────────────────────
const MAX_VAGAS_SHORTLIST_POR_EXECUCAO = 15;
async function convidarShortlist(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const vagas = await prisma.vacancy.findMany({
    where: { status: "ABERTA", publicSlug: { not: null } },
    select: {
      id: true, titulo: true, cursoRequerido: true, area: true, cidade: true, uf: true, discDesejado: true, bolsa: true,
      publicSlug: true, createdAt: true, franchiseId: true, _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "asc" }, take: 200,
  });
  if (vagas.length === 0) return r;
  const marcadores = await prisma.automacaoEnvio.findMany({
    where: { tipo: "SHORTLIST", refId: { in: vagas.map(v => v.id) } }, select: { refId: true, createdAt: true },
  });
  const ultima = new Map<string, Date>();
  for (const m of marcadores) { const a = ultima.get(m.refId); if (!a || m.createdAt > a) ultima.set(m.refId, m.createdAt); }

  const semanaAtras = new Date(ctx.agora.getTime() - 7 * 86_400_000);
  const convitesRecentes = await prisma.automacaoEnvio.findMany({
    where: { tipo: "CONVITE_VAGA", createdAt: { gte: semanaAtras }, NOT: { detalhe: { startsWith: "duplicado" } } },
    select: { destinatario: true },
  });
  const porEmail = new Map<string, number>();
  for (const c of convitesRecentes) porEmail.set(c.destinatario, (porEmail.get(c.destinatario) || 0) + 1);

  let vagasTratadas = 0;
  for (const v of vagas) {
    if (vagasTratadas >= MAX_VAGAS_SHORTLIST_POR_EXECUCAO || ctx.restante.n <= 0) break;
    if (!vagaPrecisaShortlist({ criadaEm: v.createdAt, candidatos: v._count.applications, ultimaRodada: ultima.get(v.id) || null, agora: ctx.agora })) continue;
    vagasTratadas++;

    const [jaInscritos, jaConvidados, estudantes] = await Promise.all([
      prisma.application.findMany({ where: { vacancyId: v.id }, select: { studentId: true } }),
      prisma.automacaoEnvio.findMany({ where: { tipo: "CONVITE_VAGA", refId: v.id }, select: { destinatario: true } }),
      prisma.student.findMany({
        where: { franchiseId: v.franchiseId, status: "DISPONIVEL" },
        select: { id: true, name: true, email: true, curso: true, cidade: true, uf: true, semestre: true, periodo: true, discResult: true, habilidades: true, celular: true, curriculo: true },
        take: 500,
      }),
    ]);
    const inscritos = new Set(jaInscritos.map(a => a.studentId));
    const convidados = new Set(jaConvidados.map(c => normalizarEmail(c.destinatario)));
    const elegiveis = estudantes.filter(e =>
      !inscritos.has(e.id) && !convidados.has(normalizarEmail(e.email)) && (porEmail.get(normalizarEmail(e.email)) || 0) < MAX_CONVITES_ESTUDANTE_SEMANA);
    const ranking = rankear(elegiveis, v, SCORE_MINIMO_CONVITE).slice(0, TAMANHO_SHORTLIST);

    for (const c of ranking) {
      const email = normalizarEmail(c.estudante.email);
      const ok = await enviar(ctx, r, {
        tipo: "CONVITE_VAGA", refId: v.id, para: c.estudante.email,
        assunto: `Vaga de estágio: ${v.titulo}`,
        titulo: "Uma vaga combina com você",
        corpo: `<p>Olá, ${esc((c.estudante.name || "").split(" ")[0] || "estudante")}!</p>
<p>Encontramos uma vaga de estágio que combina com o seu perfil${c.motivos.length ? " (" + esc(c.motivos.slice(0, 2).join(", ").toLowerCase()) + ")" : ""}:</p>
<p><b>${esc(v.titulo)}</b>${v.cidade ? " — " + esc(v.cidade) + (v.uf ? "/" + esc(v.uf) : "") : ""}${v.bolsa ? "<br/>Bolsa: R$ " + Number(v.bolsa).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}</p>
<p>As vagas são preenchidas rápido. Veja os detalhes e se candidate:</p>${botao(APP_URL + "/vaga/" + v.publicSlug, "Ver a vaga e me candidatar")}`,
        detalhe: `Convite vaga ${v.titulo} (${v.id}) — score ${c.score}`, franchiseId: v.franchiseId, contador: "convite",
      });
      if (ok) porEmail.set(email, (porEmail.get(email) || 0) + 1);
    }
    if (!ctx.dryRun) {
      await prisma.automacaoEnvio.create({
        data: { tipo: "SHORTLIST", refId: v.id, destinatario: "unidade", canal: "interno", detalhe: `Rodada: ${ranking.length} convidados de ${elegiveis.length} elegíveis` },
      }).catch(() => {});
    }
  }
  return r;
}

// ───────────────────────────── #10 Lembrete de entrevista ─────────────────────────────
async function lembretesEntrevista(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const de = new Date(ctx.agora.getTime() + 17 * 3_600_000);
  const ate = new Date(ctx.agora.getTime() + 31 * 3_600_000);
  const apps = await prisma.application.findMany({
    where: { etapa: "entrevista", entrevistaAt: { gte: de, lte: ate } },
    select: {
      id: true, entrevistaAt: true, entrevistaLocal: true, entrevistaLink: true,
      student: { select: { name: true, email: true } },
      vacancy: { select: { titulo: true, franchiseId: true, company: { select: { name: true } } } },
    },
    take: 100,
  });
  if (apps.length === 0) return r;
  const feitos = new Set((await prisma.automacaoEnvio.findMany({ where: { tipo: "ENTREVISTA_LEMBRETE", refId: { in: apps.map(a => a.id) } }, select: { refId: true } })).map(x => x.refId));
  for (const a of apps) {
    if (feitos.has(a.id) || !lembreteEntrevistaDevido(a.entrevistaAt, ctx.agora)) continue;
    const quando = a.entrevistaAt!.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full", timeStyle: "short" });
    await enviar(ctx, r, {
      tipo: "ENTREVISTA_LEMBRETE", refId: a.id, para: a.student.email,
      assunto: "Lembrete: sua entrevista é amanhã",
      titulo: "Lembrete de entrevista",
      corpo: `<p>Olá, ${esc((a.student.name || "").split(" ")[0] || "estudante")}!</p>
<p>Sua entrevista para <b>${esc(a.vacancy.titulo)}</b> (${esc(a.vacancy.company.name)}) está marcada para <b>${esc(quando)}</b>.</p>
${a.entrevistaLocal ? `<p>Local: ${esc(a.entrevistaLocal)}</p>` : ""}${a.entrevistaLink ? botao(a.entrevistaLink, "Entrar na entrevista online") : ""}
<p>Dica: chegue 10 minutos antes, leve documento com foto e prepare-se para falar sobre seu curso e seus objetivos. Boa sorte!</p>`,
      detalhe: `Lembrete de entrevista — ${a.vacancy.titulo}`, franchiseId: a.vacancy.franchiseId, contador: "entrevista",
    });
  }
  return r;
}

// ───────────────────────────── Avaliação semestral obrigatória (cobra até preencher) ─────────────────────────────
const MAX_SEMESTRAIS_POR_EXECUCAO = 40;
async function avaliacoesSemestrais(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const contratos = await prisma.contract.findMany({
    where: { status: "ATIVO", dataInicio: { lte: new Date(ctx.agora.getTime() - 165 * 86_400_000) } },
    select: {
      id: true, dataInicio: true, franchiseId: true,
      company: { select: { name: true, email: true } },
      student: { select: { name: true } },
      evaluations: { where: { status: "respondido" }, select: { respondidoAt: true }, orderBy: { respondidoAt: "desc" }, take: 1 },
    },
    orderBy: { dataInicio: "asc" },
    take: 500,
  });
  if (contratos.length === 0) return r;
  const logs = await prisma.automacaoEnvio.findMany({
    where: { tipo: "AVALIACAO_SEMESTRAL", refId: { in: contratos.map(c => c.id) }, NOT: { detalhe: { startsWith: "duplicado" } } },
    select: { refId: true, createdAt: true },
  });
  const porContrato = new Map<string, Date[]>();
  for (const l of logs) porContrato.set(l.refId, [...(porContrato.get(l.refId) || []), l.createdAt]);

  let feitos = 0;
  for (const c of contratos) {
    if (feitos >= MAX_SEMESTRAIS_POR_EXECUCAO || ctx.restante.n <= 0) break;
    const devida = semestralDevida({
      dataInicio: c.dataInicio, ultimaRespondidaEm: c.evaluations[0]?.respondidoAt ?? null,
      enviosDoCiclo: porContrato.get(c.id) || [], agora: ctx.agora,
    });
    if (!devida) continue;
    const aluno = c.student?.name || "o(a) estagiário(a)";
    const link = `${APP_URL}/portal-empresa/avaliacoes?contrato=${c.id}`;
    const prazo = devida.diasParaFechar > 0 ? `completa 6 meses em ${devida.diasParaFechar} dia(s)` : `já passou de 6 meses`;
    const cobranca = devida.acao === "cobranca";
    const corpo = cobranca
      ? `<p>Olá, <strong>${esc(c.company?.name || "")}</strong>!</p>
<p>Ainda não recebi a <strong>avaliação semestral</strong> de <strong>${esc(aluno)}</strong>. Você consegue preencher hoje? São poucas perguntas e leva menos de 3 minutos.</p>
${botao(link, "Preencher a avaliação")}
<p>Ela é obrigatória por lei (Lei 11.788/2008, art. 9º, VII): sem o relatório a cada 6 meses, a empresa e a instituição de ensino ficam irregulares e o estágio pode ser descaracterizado.</p>
<p style="color:#64748b;font-size:12px">Se o botão não abrir, copie este link no navegador:<br/>${link}<br/>Esqueceu a senha do portal? Use "Esqueci minha senha" na tela de entrada ou responda este e-mail.</p>`
      : `<p>Olá, <strong>${esc(c.company?.name || "")}</strong>!</p>
<p>O estágio de <strong>${esc(aluno)}</strong> ${prazo}. Neste ponto precisamos da <strong>avaliação semestral</strong>, que é obrigatória por lei (Lei 11.788/2008, art. 9º, VII) e vai para a instituição de ensino.</p>
<p>Você consegue preencher esta semana? São poucas perguntas (pontualidade, produtividade, iniciativa, comunicação, aprendizado e postura) e leva menos de 3 minutos.</p>
${botao(link, "Preencher a avaliação")}
<p style="color:#64748b;font-size:12px">Se o botão não abrir, copie este link no navegador:<br/>${link}</p>`;
    const ok = await enviar(ctx, r, {
      tipo: "AVALIACAO_SEMESTRAL", refId: c.id, para: c.company?.email,
      assunto: cobranca ? `Falta a avaliação semestral de ${aluno}` : `Avaliação semestral de ${aluno}: você consegue preencher?`,
      titulo: "Avaliação semestral obrigatória", corpo,
      detalhe: `Avaliação semestral ${devida.numero}/${MAX_COBRANCAS_SEMESTRAL}: ${aluno} (${c.company?.name})`,
      franchiseId: c.franchiseId, contador: "semestral",
    });
    if (!ok) continue;
    feitos++;
    if (devida.numero === COBRANCA_ESCALA_UNIDADE) {
      await avisarUnidadeUmaVez(ctx, {
        franchiseId: c.franchiseId, refId: c.id, tipo: "AVALIACAO_SEMESTRAL_ESCALA",
        titulo: `⚠️ ${c.company?.name} não preencheu a avaliação semestral de ${aluno}`,
        mensagem: `A Lia já cobrou ${devida.numero} vezes por e-mail. A avaliação semestral é obrigatória por lei: ligue para a empresa ou ajude a preencher.`,
        link: `/dashboard/contratos/${c.id}`,
      });
    }
  }
  return r;
}

// ───────────────────────────── Fim de estágio e limite de 2 anos ─────────────────────────────
async function fimDeEstagio(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const contratos = await prisma.contract.findMany({
    where: { status: "ATIVO", dataFim: { gte: ctx.agora, lte: new Date(ctx.agora.getTime() + 31 * 86_400_000) } },
    select: {
      id: true, dataInicio: true, dataFim: true, franchiseId: true, studentId: true, companyId: true,
      company: { select: { name: true, email: true } },
      student: { select: { name: true, email: true } },
      franchise: { select: { name: true, email: true, telefone: true } },
    },
    orderBy: { dataFim: "asc" },
    take: 300,
  });
  if (contratos.length === 0) return r;
  const inicios = await primeirosInicios(contratos);
  const refs: string[] = [];
  const marcos = new Map<string, number>();
  for (const c of contratos) {
    const m = marcoFim(Math.ceil((c.dataFim.getTime() - ctx.agora.getTime()) / 86_400_000));
    if (m === null) continue;
    marcos.set(c.id, m);
    refs.push(`${c.id}:${m}`);
  }
  if (refs.length === 0) return r;
  const feitos = new Set((await prisma.automacaoEnvio.findMany({
    where: { tipo: { in: ["FIM_ESTAGIO_EMPRESA", "FIM_ESTAGIO_ESTUDANTE"] }, refId: { in: refs }, NOT: { detalhe: { startsWith: "duplicado" } } },
    select: { tipo: true, refId: true },
  })).map(x => `${x.tipo}|${x.refId}`));

  for (const c of contratos) {
    const m = marcos.get(c.id);
    if (m === undefined || ctx.restante.n <= 0) continue;
    const ref = `${c.id}:${m}`;
    const fim = c.dataFim.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    const aluno = c.student?.name || "o(a) estagiário(a)";
    const empresa = c.company?.name || "a empresa";
    const contato = [c.franchise?.name, c.franchise?.telefone, c.franchise?.email].filter(Boolean).map(x => esc(String(x))).join(" · ");
    const lim = limiteDoisAnosAcumulado(inicios.get(`${c.studentId}:${c.companyId}`) || c.dataInicio, c.dataFim);
    const noLimite = lim.noLimite;
    const limiteTxt = lim.dataLimite.toLocaleDateString("pt-BR", { timeZone: "UTC" });

    // Empresa: aviso final (7 dias) com o termo de realização; 90/60/30 já saem pela renovação.
    if (m === 7 && !feitos.has(`FIM_ESTAGIO_EMPRESA|${ref}`)) {
      await enviar(ctx, r, {
        tipo: "FIM_ESTAGIO_EMPRESA", refId: ref, para: c.company?.email,
        assunto: `O estágio de ${aluno} termina em ${fim}`, titulo: "Estágio chegando ao fim",
        corpo: `<p>Olá, <strong>${esc(empresa)}</strong>!</p>
<p>O estágio de <strong>${esc(aluno)}</strong> termina em <strong>${fim}</strong>, daqui a poucos dias.</p>
${noLimite ? `<p>Ele(a) completa o limite de <strong>2 anos</strong> de estágio na mesma empresa (previsto até ${limiteTxt}), então não dá para renovar. Se quiser manter ${esc(aluno)} na equipe, o caminho é a <strong>efetivação</strong>.</p>` : `<p>Se quiser continuar, ainda dá tempo de fazer o aditivo de renovação: é só responder este e-mail.</p>`}
<p>No encerramento a empresa entrega ao estagiário o <strong>Termo de Realização do Estágio</strong> (Lei 11.788/2008, art. 9º, V), com as atividades, o período e a avaliação de desempenho. A sua unidade ajuda a emitir: ${contato}</p>
<p>${noLimite ? "Quer abrir uma nova vaga para dar continuidade ao trabalho?" : "Precisa de um novo estagiário para esta vaga?"} É só responder.</p>`,
        detalhe: `Fim de estágio 7d: ${aluno} (${empresa}) termina ${fim}`, franchiseId: c.franchiseId, contador: "fim",
      });
    }

    // Estudante: 30 e 7 dias antes.
    if (!feitos.has(`FIM_ESTAGIO_ESTUDANTE|${ref}`)) {
      await enviar(ctx, r, {
        tipo: "FIM_ESTAGIO_ESTUDANTE", refId: ref, para: c.student?.email,
        assunto: `Seu estágio na ${empresa} termina em ${fim}`, titulo: "Seu estágio está chegando ao fim",
        corpo: `<p>Olá, ${esc((aluno.split(" ")[0]) || "estudante")}!</p>
<p>Seu estágio na <strong>${esc(empresa)}</strong> termina em <strong>${fim}</strong>${noLimite ? ", quando você completa o limite de 2 anos na mesma empresa" : ""}.</p>
<p>${noLimite ? "A empresa pode te efetivar como funcionário(a); vale conversar com o seu gestor. " : "Se a empresa renovar, a sua unidade cuida do aditivo e você só precisa assinar. "}Você também tem direito ao <strong>Termo de Realização do Estágio</strong> no encerramento: peça à empresa se ela ainda não entregou.</p>
<p>Quer que eu procure uma nova vaga para você depois? Responda este e-mail contando o curso e o horário que prefere, ou fale com a sua unidade: ${contato}</p>`,
        detalhe: `Fim de estágio ${m}d (estudante): ${aluno} termina ${fim}`, franchiseId: c.franchiseId, contador: "fim",
      });
    }
  }
  return r;
}

// ───────────────────────────── Pesquisa de satisfação pós-estágio ─────────────────────────────
const MAX_PESQUISAS_POR_EXECUCAO = 15;
async function pesquisasPosEstagio(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const desde = new Date(ctx.agora.getTime() - 31 * 86_400_000);
  const contratos = await prisma.contract.findMany({
    where: { status: "FINALIZADO", updatedAt: { gte: desde }, OR: [{ origem: null }, { origem: { not: "MIGRADO" } }] },
    select: {
      id: true, updatedAt: true, franchiseId: true, companyId: true,
      company: { select: { name: true, email: true } },
      student: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });
  if (contratos.length === 0) return r;
  const logs = await prisma.automacaoEnvio.findMany({
    where: { tipo: { in: ["PESQUISA_EMPRESA", "PESQUISA_ESTUDANTE"] }, NOT: { detalhe: { startsWith: "duplicado" } }, createdAt: { gte: new Date(ctx.agora.getTime() - 90 * 86_400_000) } },
    select: { tipo: true, refId: true, destinatario: true, createdAt: true },
  });
  const jaContrato = new Set(logs.map(l => `${l.tipo}|${l.refId}`));
  // Uma empresa com vários encerramentos não recebe várias pesquisas seguidas: 1 a cada 60 dias por e-mail.
  const sessentaDias = ctx.agora.getTime() - 60 * 86_400_000;
  const empresaRecente = new Set(logs.filter(l => l.tipo === "PESQUISA_EMPRESA" && l.createdAt.getTime() >= sessentaDias).map(l => l.destinatario));

  let feitos = 0;
  for (const c of contratos) {
    if (feitos >= MAX_PESQUISAS_POR_EXECUCAO || ctx.restante.n <= 0) break;
    const aluno = c.student?.name || "o(a) estagiário(a)";
    const empresa = c.company?.name || "a empresa";

    const emailEmp = normalizarEmail(c.company?.email);
    if (pesquisaDevida({ encerradoEm: c.updatedAt, jaEnviada: jaContrato.has(`PESQUISA_EMPRESA|${c.id}`), agora: ctx.agora }) && !empresaRecente.has(emailEmp)) {
      const ok = await enviar(ctx, r, {
        tipo: "PESQUISA_EMPRESA", refId: c.id, para: c.company?.email,
        assunto: `Como foi ter ${aluno} na ${empresa}?`, titulo: "Sua opinião sobre o estágio",
        corpo: `<p>Olá, <strong>${esc(empresa)}</strong>!</p>
<p>O estágio de <strong>${esc(aluno)}</strong> foi encerrado. De 0 a 10, o quanto você recomendaria a Smarter para outra empresa?</p>
<p>Responda este e-mail com a nota e, se puder, o que funcionou bem e o que podemos melhorar. Leva 1 minuto e a sua unidade lê cada resposta.</p>
<p>E se a empresa vai precisar de um novo estagiário, é só dizer: eu já peço à unidade para separar candidatos.</p>`,
        detalhe: `Pesquisa de satisfação (empresa) — ${aluno} / ${empresa}`, franchiseId: c.franchiseId, contador: "pesquisa",
      });
      if (ok) { feitos++; empresaRecente.add(emailEmp); }
    }
    if (ctx.restante.n <= 0) break;
    if (pesquisaDevida({ encerradoEm: c.updatedAt, jaEnviada: jaContrato.has(`PESQUISA_ESTUDANTE|${c.id}`), agora: ctx.agora })) {
      const ok = await enviar(ctx, r, {
        tipo: "PESQUISA_ESTUDANTE", refId: c.id, para: c.student?.email,
        assunto: `Como foi seu estágio na ${empresa}?`, titulo: "Sua opinião sobre o estágio",
        corpo: `<p>Olá, ${esc((aluno.split(" ")[0]) || "estudante")}!</p>
<p>Seu estágio na <strong>${esc(empresa)}</strong> foi encerrado. De 0 a 10, o quanto você recomendaria a Smarter para um colega?</p>
<p>Responda este e-mail com a nota e contando o que foi bom e o que podemos melhorar. Também me diga se quer que eu procure uma nova vaga para você.</p>`,
        detalhe: `Pesquisa de satisfação (estudante) — ${aluno} / ${empresa}`, franchiseId: c.franchiseId, contador: "pesquisa",
      });
      if (ok) feitos++;
    }
  }
  return r;
}

// ───────────────────────────── Vagas paradas e empresa sem retorno ─────────────────────────────
const MAX_VAGAS_AVISO_POR_EXECUCAO = 20;
async function vagasParadasERetorno(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const vagas = await prisma.vacancy.findMany({
    where: { status: "ABERTA", company: { status: "ATIVA" } },
    select: {
      id: true, titulo: true, createdAt: true, franchiseId: true,
      company: { select: { name: true, email: true, responsavel: true } },
      applications: { select: { etapa: true, etapaChangedAt: true, createdAt: true, student: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  });
  if (vagas.length === 0) return r;
  const logs = await prisma.automacaoEnvio.findMany({
    where: { tipo: { in: ["VAGA_PARADA", "RETORNO_EMPRESA"] }, refId: { in: vagas.map(v => v.id) }, NOT: { detalhe: { startsWith: "duplicado" } } },
    select: { tipo: true, refId: true, createdAt: true },
  });
  const por = (tipo: string, id: string) => logs.filter(l => l.tipo === tipo && l.refId === id).map(l => l.createdAt);

  let feitos = 0;
  for (const v of vagas) {
    if (feitos >= MAX_VAGAS_AVISO_POR_EXECUCAO || ctx.restante.n <= 0) break;
    const oi = v.company.responsavel ? `Olá, ${esc(v.company.responsavel.split(" ")[0])}!` : `Olá, <strong>${esc(v.company.name)}</strong>!`;

    // Candidatos que já passaram por entrevista e esperam a decisão da empresa.
    const esperando = v.applications.filter(a => a.etapa === "entrevista");
    const maisAntiga = esperando.length
      ? new Date(Math.min(...esperando.map(a => (a.etapaChangedAt || a.createdAt || ctx.agora).getTime())))
      : null;
    const retorno = retornoEmpresaDevido({ maisAntigaParadaEm: maisAntiga, envios: por("RETORNO_EMPRESA", v.id), agora: ctx.agora });
    if (retorno) {
      const nomes = esperando.slice(0, 3).map(a => esc((a.student?.name || "").split(" ")[0])).filter(Boolean).join(", ");
      const ok = await enviar(ctx, r, {
        tipo: "RETORNO_EMPRESA", refId: v.id, para: v.company.email,
        assunto: `Vaga ${v.titulo}: já decidiu sobre os candidatos?`, titulo: "Candidatos aguardando retorno",
        corpo: `<p>${oi}</p>
<p>Para a vaga <strong>${esc(v.titulo)}</strong>, ${esperando.length === 1 ? "há 1 candidato entrevistado" : `há ${esperando.length} candidatos entrevistados`}${nomes ? ` (${nomes})` : ""} aguardando a sua decisão. Você já decidiu quem segue?</p>
<p>Responda este e-mail dizendo quem aprovar e quem dispensar, ou me diga se precisa de mais tempo ou de outros perfis. Candidato sem retorno costuma aceitar outra proposta.</p>`,
        detalhe: `Retorno da empresa ${retorno.numero}/3 — ${v.titulo} (${v.id})`, franchiseId: v.franchiseId, contador: "vaga",
      });
      if (ok) {
        feitos++;
        if (retorno.numero >= 3) {
          await avisarUnidadeUmaVez(ctx, {
            franchiseId: v.franchiseId, refId: v.id, tipo: "RETORNO_EMPRESA_ESCALA",
            titulo: `⚠️ ${v.company.name} não respondeu sobre candidatos da vaga ${v.titulo}`,
            mensagem: "A Lia já cobrou 3 vezes por e-mail. Ligue para a empresa para fechar a decisão antes que os candidatos desistam.",
            link: "/dashboard/processos",
          });
        }
      }
      continue; // 1 e-mail por vaga por dia
    }

    const parada = vagaParadaDevida({ criadaEm: v.createdAt, envios: por("VAGA_PARADA", v.id), agora: ctx.agora });
    if (parada && esperando.length === 0) {
      const dias = diasEntre(v.createdAt!, ctx.agora);
      const ok = await enviar(ctx, r, {
        tipo: "VAGA_PARADA", refId: v.id, para: v.company.email,
        assunto: `A vaga de ${v.titulo} ainda está aberta?`, titulo: "Sua vaga segue aberta",
        corpo: `<p>${oi}</p>
<p>A vaga <strong>${esc(v.titulo)}</strong> está aberta há ${dias} dias${v.applications.length ? ` e tem ${v.applications.length} candidato(s) inscrito(s)` : " e ainda não recebeu candidatos"}. Você ainda precisa de estagiário(a)?</p>
<p>Se sim, posso pedir à unidade para ajustar o que pesa mais (bolsa, horário, curso aceito) e divulgar de novo. Se a vaga já foi preenchida ou não é mais necessária, me avise para eu encerrar. Basta responder este e-mail.</p>`,
        detalhe: `Vaga parada ${parada.numero}/3 — ${v.titulo} (${v.id})`, franchiseId: v.franchiseId, contador: "vaga",
      });
      if (ok) {
        feitos++;
        if (parada.numero >= 3) {
          await avisarUnidadeUmaVez(ctx, {
            franchiseId: v.franchiseId, refId: v.id, tipo: "VAGA_PARADA_ESCALA",
            titulo: `⚠️ Vaga ${v.titulo} (${v.company.name}) parada há ${dias} dias sem resposta`,
            mensagem: "A Lia já perguntou 3 vezes se a vaga continua aberta. Confirme com a empresa e encerre ou reative a vaga.",
            link: "/dashboard/vagas",
          });
        }
      }
    }
  }
  return r;
}

export async function rodarAutomacoesLia(opts: { dryRun?: boolean } = {}) {
  const optOut = new Set((await prisma.contatoOptOut.findMany({ select: { email: true } })).map(o => normalizarEmail(o.email)));
  const ctx: Ctx = {
    dryRun: !!opts.dryRun,
    agora: new Date(),
    restante: { n: TETO_ENVIOS_POR_EXECUCAO },
    optOut,
    vistos: new Set(),
    porUnidade: new Map(),
  };
  // Ordem de prioridade: assinatura (destrava contrato) > renovação (receita) > avaliação
  const assinaturas = await lembretesAssinatura(ctx);
  const renov = await renovacoes(ctx);
  const semestrais = await avaliacoesSemestrais(ctx);
  const fim = await fimDeEstagio(ctx);
  const aval = await avaliacoes(ctx);
  const crm = await followupsCrm(ctx);
  const entrevistas = await lembretesEntrevista(ctx);
  const convites = await convidarShortlist(ctx);
  const portal = await ativarPortalEmpresas(ctx);
  const reativacao = await reativarEmpresas(ctx);
  const relatorios = await relatoriosSemestraisIES(ctx);
  const convenios = await conveniosIES(ctx);
  const vagasParadas = await vagasParadasERetorno(ctx);
  const pesquisas = await pesquisasPosEstagio(ctx);
  const unidadesAvisadas = await avisarUnidades(ctx);
  return {
    dryRun: ctx.dryRun,
    teto: TETO_ENVIOS_POR_EXECUCAO,
    assinaturas, renovacoes: renov, semestrais, fim, avaliacoes: aval, crm, entrevistas, convites, portal, reativacao, relatorios, convenios, vagasParadas, pesquisas, unidadesAvisadas,
  };
}
