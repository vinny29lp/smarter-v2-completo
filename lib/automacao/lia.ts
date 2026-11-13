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
import { proximoFollowup, mensagemFollowup, ETAPAS_FOLLOWUP, LIMITE_DIARIO_UNIDADE, MAX_FOLLOWUPS } from "./crmFollowup";
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

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

function templateEmail(titulo: string, corpo: string, email: string): string {
  const optout = `${APP_URL}/optout?e=${encodeURIComponent(email)}&t=${tokenOptOut(email)}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.6;margin:0;padding:20px;background:#ffffff">
  <p style="margin:0 0 2px;font-weight:700;font-size:15px;color:#0f2a5e">${esc(titulo)}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0 16px"/>
  ${corpo}
  <p style="margin-top:28px;font-size:11px;color:#94a3b8">Smarter Estágios — aviso automático da Lia, assistente da sua unidade.<br/>
  Não quer mais receber estes avisos? <a href="${optout}" style="color:#94a3b8">Clique aqui para parar de receber</a>.</p>
</body></html>`;
}

const botao = (href: string, texto: string) =>
  `<p style="margin:18px 0"><a href="${href}" style="background:#0f2a5e;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700">${esc(texto)}</a></p>`;

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
  porUnidade: Map<string, { renovacao: number; avaliacao: number; assinatura: number; crm: number }>;
}

function contar(ctx: Ctx, franchiseId: string, k: "renovacao" | "avaliacao" | "assinatura" | "crm") {
  const c = ctx.porUnidade.get(franchiseId) || { renovacao: 0, avaliacao: 0, assinatura: 0, crm: 0 };
  c[k] += 1;
  ctx.porUnidade.set(franchiseId, c);
}

async function enviar(ctx: Ctx, r: Resultado, p: {
  tipo: string; refId: string; para: string | null | undefined; assunto: string; titulo: string;
  corpo: string; detalhe: string; franchiseId: string; contador: "renovacao" | "avaliacao" | "assinatura" | "crm";
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

  const ok = await sendMail(email, p.assunto, templateEmail(p.titulo, p.corpo, email));
  if (!ok) { r.falhas++; return false; }
  ctx.restante.n--;
  r.enviados++;
  contar(ctx, p.franchiseId, p.contador);
  await prisma.automacaoEnvio.create({
    data: { tipo: p.tipo, refId: p.refId, destinatario: email, detalhe: p.detalhe.slice(0, 300) },
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
  const unidadesAvisadas = await avisarUnidades(ctx);
  return {
    dryRun: ctx.dryRun,
    teto: TETO_ENVIOS_POR_EXECUCAO,
    assinaturas, renovacoes: renov, avaliacoes: aval, crm, unidadesAvisadas,
  };
}
