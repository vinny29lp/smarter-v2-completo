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
import { tokenOptOut } from "./token";
import { randomUUID } from "crypto";
import { esc, botao, templateLiaEmail, linksPorTipo, enderecoResposta, type Topico } from "./emailBrand";
import { proximoFollowup, mensagemFollowup, ETAPAS_FOLLOWUP, LIMITE_DIARIO_UNIDADE, MAX_FOLLOWUPS } from "./crmFollowup";
import { reativacaoDevida, ativacaoPortalDevida, vagaPrecisaShortlist, lembreteEntrevistaDevido, MAX_REATIVACOES, MAX_AVISOS_PORTAL, MAX_CONVITES_ESTUDANTE_SEMANA, SCORE_MINIMO_CONVITE, TAMANHO_SHORTLIST } from "./engajamento";
import { rankear } from "@/lib/matching/matching";
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

type Contador = "renovacao" | "avaliacao" | "assinatura" | "crm" | "reativacao" | "portal" | "convite" | "entrevista";
const zerados = (): Record<Contador, number> => ({ renovacao: 0, avaliacao: 0, assinatura: 0, crm: 0, reativacao: 0, portal: 0, convite: 0, entrevista: 0 });

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
  const ok = await sendMail(email, p.assunto, templateEmail(p.titulo, p.corpo, email, p.tipo), undefined, undefined, replyTo ? { replyTo } : undefined);
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

// ───────────────────────────── #17 Renovação 90/60/30 ─────────────────────────────
async function renovacoes(ctx: Ctx): Promise<Resultado> {
  const r = novoResultado();
  const contratos = await prisma.contract.findMany({
    where: { status: "ATIVO", dataFim: { gte: ctx.agora, lte: new Date(ctx.agora.getTime() + 91 * 86_400_000) } },
    select: {
      id: true, dataInicio: true, dataFim: true, franchiseId: true,
      company: { select: { name: true, email: true } },
      student: { select: { name: true } },
      franchise: { select: { name: true, email: true, telefone: true } },
    },
    orderBy: { dataFim: "asc" },
    take: 400,
  });
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
    const efetivar = limiteDeDoisAnos(c.dataInicio, c.dataFim);
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
    if (m !== null) marcos.set(c.id, m);
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
      assunto: "Precisa de estagiários? Temos candidatos prontos",
      titulo: "Estagiários para a " + e.name,
      corpo: `<p>Olá${e.responsavel ? ", " + esc(e.responsavel.split(" ")[0]) : ""}!</p>
<p>Notamos que a <b>${esc(e.name)}</b> está cadastrada na Smarter, mas hoje não tem estagiário conosco. Temos estudantes qualificados e prontos para começar, e cuidamos de toda a parte burocrática: contrato, seguro e acompanhamento.</p>
<p>Basta nos contar o perfil que você procura — leva menos de 2 minutos:</p>${botao(APP_URL + "/solicitar-vaga", "Solicitar uma vaga")}`,
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
      assunto: "Seu portal da Smarter está pronto — acompanhe seus estagiários",
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
        assunto: `Vaga de estágio com a sua cara: ${v.titulo}`,
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
  const aval = await avaliacoes(ctx);
  const crm = await followupsCrm(ctx);
  const entrevistas = await lembretesEntrevista(ctx);
  const convites = await convidarShortlist(ctx);
  const portal = await ativarPortalEmpresas(ctx);
  const reativacao = await reativarEmpresas(ctx);
  const unidadesAvisadas = await avisarUnidades(ctx);
  return {
    dryRun: ctx.dryRun,
    teto: TETO_ENVIOS_POR_EXECUCAO,
    assinaturas, renovacoes: renov, avaliacoes: aval, crm, entrevistas, convites, portal, reativacao, unidadesAvisadas,
  };
}
