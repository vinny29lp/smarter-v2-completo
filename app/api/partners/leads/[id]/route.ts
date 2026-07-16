/**
 * PATCH /api/partners/leads/[id]
 * Atualiza etapa/situação/próxima ação/valor negociado/anotação de um CrmLead
 * já existente, sempre restrito à franquia dona do token de parceiro.
 * Anotações são preservadas em histórico via CrmNota (não sobrescrevem notas
 * anteriores) — o campo `anotacao` do lead é apenas o cache da nota mais recente,
 * igual ao padrão já usado pelas rotas internas do CRM.
 */
import { prisma } from "@/lib/prisma";
import { apiErr } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit, getClientIP } from "@/lib/audit";
import { authenticatePartnerCrmToken } from "@/lib/partner-auth";
import { partnerAtualizarLeadSchema, zodError } from "@/lib/api-schemas";
import { SLA_CONFIG } from "@/lib/crm/sla-config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticatePartnerCrmToken(req);
  if (!auth) {
    return apiErr("Não autorizado.", 401, "PARTNER_UNAUTHORIZED");
  }

  if (!checkRateLimit(auth.tokenId, "partner_leads_write", 60, 60_000)) {
    return apiErr("Muitas requisições. Tente novamente em instantes.", 429, "PARTNER_RATE_LIMITED");
  }

  const existing = await prisma.crmLead.findUnique({
    where: { id: params.id },
    select: { franchiseId: true },
  });
  if (!existing) {
    return apiErr("Lead não encontrado.", 404, "PARTNER_NOT_FOUND");
  }
  if (existing.franchiseId !== auth.franchiseId) {
    return apiErr("Este lead não pertence à franquia do token informado.", 403, "PARTNER_FORBIDDEN");
  }

  const rawBody = await req.json();
  const parsed = partnerAtualizarLeadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErr(zodError(parsed.error).error, 400, "PARTNER_INVALID_PARAM");
  }
  const body = parsed.data;

  const vendido = body.situacao === "vendido";

  const lead = await prisma.crmLead.update({
    where: { id: params.id },
    data: {
      ...(body.etapa !== undefined && !vendido ? { etapa: body.etapa, etapaChangedAt: new Date() } : {}),
      ...(body.situacao       !== undefined ? { situacao: body.situacao }                       : {}),
      ...(body.proximaAcao    !== undefined ? { proximaAcao: body.proximaAcao }                 : {}),
      ...(body.valorNegociado !== undefined ? { valorNegociado: body.valorNegociado }            : {}),
      ...(body.anotacao       !== undefined ? { anotacao: body.anotacao, ultimoContato: new Date() } : {}),
      ...(vendido ? { etapa: "fechado", etapaChangedAt: new Date(), convertido: true } : {}),
    },
  });

  if (body.etapa !== undefined && !vendido) {
    const novaEtapa = SLA_CONFIG[body.etapa]?.label || body.etapa;
    await prisma.crmNota.create({
      data: { leadId: params.id, texto: `📍 Etapa atualizada para "${novaEtapa}" (via parceiro).`, tipo: "etapa" },
    });
  }
  if (vendido) {
    await prisma.crmNota.create({
      data: { leadId: params.id, texto: "🏆 Lead marcado como VENDIDO! (via parceiro)", tipo: "anotacao" },
    });
  } else if (body.situacao === "perdido") {
    await prisma.crmNota.create({
      data: { leadId: params.id, texto: "Lead marcado como PERDIDO (via parceiro).", tipo: "anotacao" },
    });
  }
  if (body.anotacao !== undefined) {
    await prisma.crmNota.create({
      data: { leadId: params.id, texto: `📋 (via parceiro) ${body.anotacao}`, tipo: "anotacao" },
    });
  }

  logAudit({
    role: "PARTNER",
    franchiseId: auth.franchiseId,
    acao: "CRM_LEAD_ATUALIZADO_PARCEIRO",
    modulo: "crm",
    detalhes: `lead:${params.id} | tokenId:${auth.tokenId}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ lead });
}
