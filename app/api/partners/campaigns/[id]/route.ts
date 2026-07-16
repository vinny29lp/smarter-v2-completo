/**
 * PATCH /api/partners/campaigns/[id]
 * Atualiza métricas de uma campanha de tráfego pago já registrada (gasto,
 * impressões, cliques, leads, CPL, ROAS, status), sempre restrito à franquia
 * dona do token de parceiro. Chamada periodicamente pelo Alizo conforme a
 * campanha roda na plataforma de anúncio.
 * Auth: Bearer token validado contra partner_api_tokens, exigindo escopo "marketing".
 */
import { prisma } from "@/lib/prisma";
import { apiErr } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit, getClientIP } from "@/lib/audit";
import { authenticatePartnerCrmToken } from "@/lib/partner-auth";
import { partnerAtualizarCampanhaSchema, zodError } from "@/lib/api-schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticatePartnerCrmToken(req, "marketing");
  if (!auth) {
    return apiErr("Não autorizado.", 401, "PARTNER_UNAUTHORIZED");
  }

  if (!checkRateLimit(auth.tokenId, "partner_campaigns_write", 60, 60_000)) {
    return apiErr("Muitas requisições. Tente novamente em instantes.", 429, "PARTNER_RATE_LIMITED");
  }

  const existing = await prisma.marketingTrafegoPago.findUnique({
    where: { id: params.id },
    select: { franchiseId: true },
  });
  if (!existing) {
    return apiErr("Campanha não encontrada.", 404, "PARTNER_NOT_FOUND");
  }
  if (existing.franchiseId !== auth.franchiseId) {
    return apiErr("Esta campanha não pertence à franquia do token informado.", 403, "PARTNER_FORBIDDEN");
  }

  const rawBody = await req.json();
  const parsed = partnerAtualizarCampanhaSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErr(zodError(parsed.error).error, 400, "PARTNER_INVALID_PARAM");
  }
  const body = parsed.data;

  const campanha = await prisma.marketingTrafegoPago.update({
    where: { id: params.id },
    data: {
      ...(body.gastoTotal    !== undefined ? { gastoTotal: body.gastoTotal }       : {}),
      ...(body.impressoes    !== undefined ? { impressoes: body.impressoes }       : {}),
      ...(body.cliques       !== undefined ? { cliques: body.cliques }             : {}),
      ...(body.leadsGerados  !== undefined ? { leadsGerados: body.leadsGerados }   : {}),
      ...(body.cpl           !== undefined ? { cpl: body.cpl }                     : {}),
      ...(body.roas          !== undefined ? { roas: body.roas }                   : {}),
      ...(body.status        !== undefined ? { status: body.status }               : {}),
      ...(body.dataFim       !== undefined ? { dataFim: body.dataFim ? new Date(body.dataFim) : null } : {}),
      lastSyncedAt: new Date(),
    },
  });

  logAudit({
    role: "PARTNER",
    franchiseId: auth.franchiseId,
    acao: "TRAFEGO_PAGO_CAMPANHA_ATUALIZADA_PARCEIRO",
    modulo: "marketing",
    detalhes: `campanha:${params.id} | tokenId:${auth.tokenId}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ campanha });
}
