/**
 * POST /api/app/alizo/lead — { leadId, acao: "enviar" | "pausar" | "retomar" }
 * Controla o atendimento do Sales (Alizo) para um lead do CRM. A unidade vem da sessão; o lead precisa ser da unidade.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { contextoAlizo } from "@/lib/alizo/acesso";
import { criarAlizoClient, mensagemAmigavel } from "@/lib/alizo/client";
import { enviarLeadParaAlizo } from "@/lib/alizo/sync";

export const dynamic = "force-dynamic";

const MOTIVOS: Record<string, string> = {
  alizo_nao_configurado: "A integração com a Alizo ainda não está configurada.",
  sem_consentimento: "Este contato não deu consentimento para receber mensagens.",
  telefone_invalido: "O telefone deste lead é inválido para WhatsApp.",
  unidade_sem_mapeamento: "A unidade ainda não está sincronizada com a Alizo.",
  lead_nao_encontrado: "Lead não encontrado.",
};

export async function POST(req: Request) {
  try {
    const ctx = await contextoAlizo({ rota: "lead" });
    if ("erro" in ctx) return ctx.erro;
    const body = await req.json().catch(() => ({}));
    const acao = String(body.acao || "");
    if (!["enviar", "pausar", "retomar"].includes(acao)) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });

    const lead = await prisma.crmLead.findUnique({ where: { id: String(body.leadId || "") }, select: { id: true, franchiseId: true, alizoLeadId: true, alizoPausado: true, optIn: true } });
    // Isolamento: unidade só mexe em lead da própria franquia.
    if (!lead || (ctx.franchiseId && lead.franchiseId !== ctx.franchiseId)) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

    if (acao === "enviar") {
      const r = await enviarLeadParaAlizo(lead.id, { primeiroContato: true });
      if (!r.ok) return NextResponse.json({ error: MOTIVOS[r.motivo] || r.motivo }, { status: 422 });
      return NextResponse.json({ ok: true, duplicate: r.duplicate });
    }

    if (!lead.alizoLeadId) return NextResponse.json({ error: "Este lead ainda não foi enviado ao Sales." }, { status: 409 });
    if (acao === "retomar" && !lead.optIn) return NextResponse.json({ error: "Este contato pediu para não receber mensagens: não é possível retomar." }, { status: 409 });
    const client = criarAlizoClient();
    if (!client) return NextResponse.json({ error: MOTIVOS.alizo_nao_configurado }, { status: 503 });
    try {
      if (acao === "pausar") await client.pausarLead(lead.alizoLeadId); else await client.retomarLead(lead.alizoLeadId);
    } catch (e) { return NextResponse.json({ error: mensagemAmigavel(e) }, { status: 502 }); }
    await prisma.crmLead.update({ where: { id: lead.id }, data: { alizoPausado: acao === "pausar" } });
    await prisma.crmNota.create({ data: { leadId: lead.id, tipo: "whatsapp", texto: acao === "pausar" ? "⏸️ Automação do Sales pausada (atendimento humano)." : "▶️ Automação do Sales retomada." } }).catch(() => {});
    return NextResponse.json({ ok: true, alizoPausado: acao === "pausar" });
  } catch (e) { return handleApiError(e, "ALIZO_LEAD_POST"); }
}
