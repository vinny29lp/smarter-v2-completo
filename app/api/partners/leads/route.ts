/**
 * POST /api/partners/leads
 * Cria um CrmLead novo, escopado à franquia do token de parceiro.
 * Usada pelo Sales Rep do AI Workforce OS/Alizo para prospectar e lançar
 * negociações direto no CRM da unidade correspondente.
 * Auth: Bearer token validado contra partner_api_tokens (ver lib/partner-auth.ts) —
 * escopo por franquia, diferente do token global de /api/partners/candidates.
 */
import { prisma } from "@/lib/prisma";
import { apiErr } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit, getClientIP } from "@/lib/audit";
import { authenticatePartnerCrmToken } from "@/lib/partner-auth";
import { partnerCriarLeadSchema, zodError } from "@/lib/api-schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await authenticatePartnerCrmToken(req);
  if (!auth) {
    return apiErr("Não autorizado.", 401, "PARTNER_UNAUTHORIZED");
  }

  if (!checkRateLimit(auth.tokenId, "partner_leads_write", 60, 60_000)) {
    return apiErr("Muitas requisições. Tente novamente em instantes.", 429, "PARTNER_RATE_LIMITED");
  }

  const rawBody = await req.json();
  const parsed = partnerCriarLeadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErr(zodError(parsed.error).error, 400, "PARTNER_INVALID_PARAM");
  }
  const body = parsed.data;

  const lead = await prisma.crmLead.create({
    data: {
      empresa:        body.empresa,
      contato:        body.contato || null,
      email:          body.email || null,
      telefone:       body.telefone || null,
      whatsapp:       body.whatsapp || null,
      cidade:         body.cidade || null,
      uf:             body.uf || null,
      setor:          body.setor || null,
      prioridade:     body.prioridade || "media",
      origem:         "alizo",
      etapa:          "novo_lead",
      situacao:       "ativo",
      etapaChangedAt: new Date(),
      franchiseId:    auth.franchiseId,
    },
  });

  if (body.anotacao) {
    await prisma.crmNota.create({
      data: { leadId: lead.id, texto: body.anotacao, tipo: "anotacao" },
    });
  }

  logAudit({
    role: "PARTNER",
    franchiseId: auth.franchiseId,
    acao: "CRM_LEAD_CRIADO_PARCEIRO",
    modulo: "crm",
    detalhes: `lead:${lead.id} | empresa:${body.empresa} | tokenId:${auth.tokenId}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ lead }, { status: 201 });
}
