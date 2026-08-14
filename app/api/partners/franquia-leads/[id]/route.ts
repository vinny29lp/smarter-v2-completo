/**
 * PATCH /api/partners/franquia-leads/[id]
 * Atualiza etapa/situação/próxima ação/anotação de um FranquiaLead já
 * existente, e registra o contato feito pelo parceiro. Diferente de
 * /api/partners/leads/[id] (CrmLead, escopado por franquia): FranquiaLead
 * não pertence a nenhuma franquia, então não há checagem de ownership por
 * franchiseId aqui — só que o token tenha o escopo "franquia_crm".
 *
 * Cada chamada bem-sucedida grava uma FranquiaNota nova (nunca sobrescreve
 * anotações anteriores) pra manter rastreabilidade visível no painel humano
 * da Smarter — importante porque um humano também pode estar trabalhando
 * esses mesmos leads em paralelo.
 */
import { prisma } from "@/lib/prisma";
import { apiErr } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit, getClientIP } from "@/lib/audit";
import { authenticatePartnerNetworkToken } from "@/lib/partner-auth";
import { partnerAtualizarFranquiaLeadSchema, zodError } from "@/lib/api-schemas";
import { FRANQUIA_PIPELINE } from "@/lib/crm/franquia-pipeline";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticatePartnerNetworkToken(req, "franquia_crm");
  if (!auth) {
    return apiErr("Não autorizado.", 401, "PARTNER_UNAUTHORIZED");
  }

  if (!checkRateLimit(auth.tokenId, "partner_franquia_leads_write", 60, 60_000)) {
    return apiErr("Muitas requisições. Tente novamente em instantes.", 429, "PARTNER_RATE_LIMITED");
  }

  const existing = await prisma.franquiaLead.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!existing) {
    return apiErr("Lead não encontrado.", 404, "PARTNER_NOT_FOUND");
  }

  const rawBody = await req.json();
  const parsed = partnerAtualizarFranquiaLeadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErr(zodError(parsed.error).error, 400, "PARTNER_INVALID_PARAM");
  }
  const body = parsed.data;

  const vendido = body.situacao === "vendido";
  const now = new Date();

  const lead = await prisma.franquiaLead.update({
    where: { id: params.id },
    data: {
      ...(body.etapa !== undefined && !vendido ? { etapa: body.etapa, etapaChangedAt: now } : {}),
      ...(body.situacao !== undefined ? { situacao: body.situacao } : {}),
      ...(body.proximaAcao !== undefined ? { proximaAcao: body.proximaAcao } : {}),
      ...(body.anotacao !== undefined ? { anotacao: body.anotacao } : {}),
      ...(body.contatoRealizado ? { ultimoContato: now } : {}),
      ...(vendido ? { etapa: "fechado", etapaChangedAt: now } : {}),
    },
  });

  if (body.etapa !== undefined && !vendido) {
    const novaEtapa = FRANQUIA_PIPELINE[body.etapa]?.label || body.etapa;
    await prisma.franquiaNota.create({
      data: { leadId: params.id, texto: `📍 Etapa atualizada para "${novaEtapa}" (via parceiro).`, tipo: "etapa" },
    });
  }
  if (vendido) {
    await prisma.franquiaNota.create({
      data: { leadId: params.id, texto: "🏆 Lead marcado como VENDIDO! (via parceiro)", tipo: "alerta" },
    });
  } else if (body.situacao === "perdido") {
    await prisma.franquiaNota.create({
      data: { leadId: params.id, texto: "Lead marcado como PERDIDO (via parceiro).", tipo: "alerta" },
    });
  }
  if (body.contatoRealizado) {
    await prisma.franquiaNota.create({
      data: {
        leadId: params.id,
        texto: `📞 Contato automático via Alizo${body.anotacao ? `: ${body.anotacao}` : "."}`,
        tipo: "whatsapp",
      },
    });
  } else if (body.anotacao !== undefined) {
    await prisma.franquiaNota.create({
      data: { leadId: params.id, texto: `📋 (via parceiro) ${body.anotacao}`, tipo: "anotacao" },
    });
  }

  logAudit({
    role: "PARTNER",
    acao: "FRANQUIA_LEAD_ATUALIZADO_PARCEIRO",
    modulo: "franquia-crm",
    detalhes: `lead:${params.id} | tokenId:${auth.tokenId}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ lead });
}
