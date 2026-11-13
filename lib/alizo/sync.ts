/**
 * Integração Smarter ⇄ Alizo: gatilho de envio de lead, processamento de eventos e importação
 * de leads do Google Maps. Toda chamada passa pelo cliente (lib/alizo/client.ts); sem chave → no-op.
 */
import { prisma } from "@/lib/prisma";
import { criarAlizoClient, normalizarTelefone, mascararTelefone, AlizoError } from "./client";

const CHAVE_MATRIZ = "MATRIZ";
const chaveFranquia = (franchiseId: string | null | undefined) => franchiseId || CHAVE_MATRIZ;

export async function alizoUnitIdDe(franchiseId: string | null | undefined): Promise<string | null> {
  const m = await prisma.alizoUnidade.findUnique({ where: { franchiseKey: chaveFranquia(franchiseId) } });
  return m?.alizoUnitId ?? null;
}

/** franchiseId da Smarter (null = Franqueadora/Matriz) para uma unidade da Alizo; undefined = não mapeada. */
async function franquiaDeUnidade(unitId: string | null | undefined): Promise<string | null | undefined> {
  if (!unitId) return undefined;
  const m = await prisma.alizoUnidade.findFirst({ where: { alizoUnitId: unitId } });
  if (!m) return undefined;
  return m.franchiseKey === CHAVE_MATRIZ ? null : m.franchiseKey;
}

export function gatilhoLeadsAtivo(): boolean {
  return process.env.ALIZO_GATILHO_LEADS_ATIVO === "true";
}

/**
 * Envia um lead do CRM da Smarter ao Sales Rep da Alizo. Só com consentimento (optIn) e telefone válido.
 * `primeiroContato:false` cria o lead pausado (sem disparo). `duplicate:true` conta como sucesso.
 */
export async function enviarLeadParaAlizo(leadId: string, opts: { primeiroContato: boolean }) {
  const client = criarAlizoClient();
  if (!client) return { ok: false as const, motivo: "alizo_nao_configurado" };

  const lead = await prisma.crmLead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false as const, motivo: "lead_nao_encontrado" };
  if (!lead.optIn) return { ok: false as const, motivo: "sem_consentimento" };
  const telefone = normalizarTelefone(lead.whatsapp || lead.telefone);
  if (!telefone) return { ok: false as const, motivo: "telefone_invalido" };
  const unitId = await alizoUnitIdDe(lead.franchiseId);
  if (!unitId) return { ok: false as const, motivo: "unidade_sem_mapeamento" };

  try {
    const r = await client.criarLead({
      unit_id: unitId, name: lead.contato || lead.empresa, phone: telefone,
      email: lead.email || undefined, source: "smarter_crm", external_id: lead.id,
      notes: `Empresa: ${lead.empresa}${lead.setor ? ` · Setor: ${lead.setor}` : ""}`,
      first_contact: opts.primeiroContato,
    });
    await prisma.crmLead.update({ where: { id: lead.id }, data: { alizoLeadId: r.lead.id } });
    await prisma.crmNota.create({
      data: { leadId: lead.id, tipo: "whatsapp", texto: `🤖 Lead enviado ao Sales Rep da Alizo${r.duplicate ? " (já existia)" : ""}${r.contacted ? " — 1º contato disparado" : ""}.` },
    }).catch(() => {});
    return { ok: true as const, duplicate: r.duplicate, contacted: !!r.contacted, alizoLeadId: r.lead.id };
  } catch (e: any) {
    console.error(`[alizo] falha ao enviar lead (${mascararTelefone(telefone)}):`, e?.status, e?.message);
    return { ok: false as const, motivo: e instanceof AlizoError ? e.message : "erro_inesperado" };
  }
}

/** Processa um evento da Alizo (webhook ou reconciliação). Idempotente pelo id do evento. */
export async function processarEventoAlizo(ev: { id: string; type: string; unit_id?: string | null; data?: any }) {
  try {
    await prisma.alizoEvento.create({ data: { id: ev.id, tipo: ev.type, unitId: ev.unit_id ?? null } });
  } catch (e: any) {
    if (e?.code === "P2002") return { processado: false, motivo: "duplicado" };
    throw e;
  }

  const d = ev.data || {};
  const alizoLeadId: string | undefined = d.lead_id || d.lead?.id || d.id;
  console.log(`[alizo] evento ${ev.type} (campos: ${Object.keys(d).join(",") || "—"})`);
  if (!alizoLeadId) return { processado: true, motivo: "sem_lead_id" };

  const lead = await prisma.crmLead.findFirst({ where: { alizoLeadId } });
  if (!lead) return { processado: true, motivo: "lead_nao_esta_no_crm" };

  const texto: string = String(d.content ?? d.message?.content ?? d.text ?? "").slice(0, 500);
  if (ev.type === "lead.message.received") {
    await prisma.crmNota.create({ data: { leadId: lead.id, tipo: "whatsapp", texto: `💬 Lead respondeu: ${texto || "(mensagem recebida)"}` } });
    await prisma.crmLead.update({ where: { id: lead.id }, data: { ultimoContato: new Date() } });
  } else if (ev.type === "lead.message.sent") {
    await prisma.crmNota.create({ data: { leadId: lead.id, tipo: "whatsapp", texto: `🤖 Mensagem enviada pelo Sales Rep: ${texto || "(sem texto)"}` } });
  } else if (ev.type === "lead.deal_won") {
    await prisma.crmLead.update({
      where: { id: lead.id },
      data: { etapa: "fechado", situacao: "vendido", convertido: true, ultimoContato: new Date(), etapaChangedAt: new Date() },
    });
    await prisma.crmNota.create({ data: { leadId: lead.id, tipo: "etapa", texto: "🏆 Negócio ganho (marcado pelo Sales Rep da Alizo)." } });
  }
  return { processado: true };
}

/**
 * Rotina periódica: (1) importa leads novos/atualizados do Google Maps para o CRM da unidade;
 * (2) reconcilia eventos perdidos via GET /events (deduplicado).
 */
export async function sincronizarAlizo(opts: { horas?: number } = {}) {
  const client = criarAlizoClient();
  if (!client) return { ok: false, motivo: "alizo_nao_configurado" };
  const desde = new Date(Date.now() - (opts.horas ?? 2) * 3_600_000).toISOString();
  const resumo = { importados: 0, ignorados: 0, eventos: 0, erros: 0 };

  const unidades = await prisma.alizoUnidade.findMany();
  for (const u of unidades) {
    try {
      const franchiseId = u.franchiseKey === CHAVE_MATRIZ ? null : u.franchiseKey;
      let before: string | undefined;
      for (let pagina = 0; pagina < 5; pagina++) {
        const r = await client.listarLeads({ unit_id: u.alizoUnitId, updated_since: desde, before, limit: 100 });
        for (const l of r.leads) {
          if (l.source !== "google_maps") { resumo.ignorados++; continue; }
          const existe = await prisma.crmLead.findFirst({ where: { alizoLeadId: l.id }, select: { id: true } });
          if (existe) { resumo.ignorados++; continue; }
          await prisma.crmLead.create({
            data: {
              empresa: l.company_name || l.name, contato: l.company_name ? l.name : null,
              telefone: l.phone, whatsapp: l.phone, email: l.email, franchiseId,
              origem: "google_maps", etapa: "novo_lead", etapaChangedAt: new Date(), alizoLeadId: l.id,
              anotacao: l.notes || null,
            },
          });
          resumo.importados++;
        }
        if (!r.next_before || r.leads.length === 0) break;
        before = r.next_before;
      }
    } catch (e: any) {
      resumo.erros++;
      console.error("[alizo-sync] unidade falhou:", e?.status, e?.message);
    }
  }

  try {
    const ev = await client.eventos({ since: desde, limit: 100 });
    for (const e of ev.events) {
      const r = await processarEventoAlizo({ id: e.id, type: e.type, unit_id: e.unit_id, data: e.data });
      if (r.processado) resumo.eventos++;
    }
  } catch (e: any) {
    resumo.erros++;
    console.error("[alizo-sync] eventos falhou:", e?.status, e?.message);
  }
  return { ok: true, ...resumo };
}
