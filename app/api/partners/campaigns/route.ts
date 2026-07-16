/**
 * POST /api/partners/campaigns
 * Registra uma campanha de tráfego pago (Meta/Google Ads) nova, escopada à
 * franquia do token de parceiro. Usada pelo funcionário de Tráfego Pago do
 * AI Workforce OS/Alizo ao criar uma campanha para a unidade correspondente.
 * Auth: Bearer token validado contra partner_api_tokens (ver lib/partner-auth.ts),
 * exigindo o escopo "marketing".
 */
import { prisma } from "@/lib/prisma";
import { apiErr } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit, getClientIP } from "@/lib/audit";
import { authenticatePartnerCrmToken } from "@/lib/partner-auth";
import { partnerCriarCampanhaSchema, zodError } from "@/lib/api-schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await authenticatePartnerCrmToken(req, "marketing");
  if (!auth) {
    return apiErr("Não autorizado.", 401, "PARTNER_UNAUTHORIZED");
  }

  if (!checkRateLimit(auth.tokenId, "partner_campaigns_write", 60, 60_000)) {
    return apiErr("Muitas requisições. Tente novamente em instantes.", 429, "PARTNER_RATE_LIMITED");
  }

  const rawBody = await req.json();
  const parsed = partnerCriarCampanhaSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErr(zodError(parsed.error).error, 400, "PARTNER_INVALID_PARAM");
  }
  const body = parsed.data;

  if (body.externalCampaignId) {
    const existing = await prisma.marketingTrafegoPago.findUnique({
      where: { plataforma_externalCampaignId: { plataforma: body.plataforma, externalCampaignId: body.externalCampaignId } },
    });
    if (existing) {
      return apiErr("Já existe uma campanha registrada com este externalCampaignId nesta plataforma.", 409, "PARTNER_CONFLICT");
    }
  }

  const campanha = await prisma.marketingTrafegoPago.create({
    data: {
      franchiseId:        auth.franchiseId,
      plataforma:         body.plataforma,
      nomeCampanha:       body.nomeCampanha,
      externalCampaignId: body.externalCampaignId || null,
      objetivo:           body.objetivo || null,
      orcamentoDiario:    body.orcamentoDiario,
      status:             body.status,
      dataInicio:         body.dataInicio ? new Date(body.dataInicio) : null,
      dataFim:            body.dataFim ? new Date(body.dataFim) : null,
      lastSyncedAt:       new Date(),
    },
  });

  logAudit({
    role: "PARTNER",
    franchiseId: auth.franchiseId,
    acao: "TRAFEGO_PAGO_CAMPANHA_CRIADA_PARCEIRO",
    modulo: "marketing",
    detalhes: `campanha:${campanha.id} | plataforma:${body.plataforma} | tokenId:${auth.tokenId}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ campanha }, { status: 201 });
}
