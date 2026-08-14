/**
 * GET /api/partners/franquia-leads
 * Lista leads do CRM de Venda de Franquias (FranquiaLead) para um parceiro
 * autorizado com o token de nível rede (escopo "franquia_crm" — ver
 * lib/partner-auth.ts). Diferente de /api/partners/leads (CrmLead, escopado
 * por franquia): FranquiaLead pertence à franqueadora como um todo, então
 * não há filtro de franchiseId aqui.
 *
 * Query params:
 *   stale   — "true" retorna só leads `situacao=ativo` com `ultimoContato`
 *             nulo ou mais antigo que STALE_DIAS (o caso de uso real desta
 *             integração: reativar os leads nunca/pouco contatados).
 *   cursor  — id do último lead da página anterior (paginação por cursor,
 *             ordenado por createdAt asc, mesmo padrão simples usado nas
 *             outras rotas de leitura de parceiro).
 *   limit   — padrão 50, máximo 200.
 *
 * Auth: Bearer token validado contra partner_api_tokens (ver lib/partner-auth.ts),
 * escopo "franquia_crm", token de nível rede (franchiseId null).
 */
import { prisma } from "@/lib/prisma";
import { apiErr, apiOk } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { authenticatePartnerNetworkToken } from "@/lib/partner-auth";

export const dynamic = "force-dynamic";

const STALE_DIAS = 3;

export async function GET(req: Request) {
  const auth = await authenticatePartnerNetworkToken(req, "franquia_crm");
  if (!auth) {
    return apiErr("Não autorizado.", 401, "PARTNER_UNAUTHORIZED");
  }

  if (!checkRateLimit(auth.tokenId, "partner_franquia_leads_read", 60, 60_000)) {
    return apiErr("Muitas requisições. Tente novamente em instantes.", 429, "PARTNER_RATE_LIMITED");
  }

  const { searchParams } = new URL(req.url);
  const stale = searchParams.get("stale") === "true";
  const cursor = searchParams.get("cursor") || undefined;
  const limitParam = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const staleThreshold = new Date(Date.now() - STALE_DIAS * 24 * 60 * 60 * 1000);

  const leads = await prisma.franquiaLead.findMany({
    where: stale
      ? {
          situacao: "ativo",
          OR: [{ ultimoContato: null }, { ultimoContato: { lt: staleThreshold } }],
        }
      : undefined,
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      nomeCompleto: true,
      email: true,
      telefone: true,
      cidade: true,
      estado: true,
      etapa: true,
      situacao: true,
      origem: true,
      leadFrio: true,
      optIn: true,
      ultimoContato: true,
      proximaAcao: true,
      createdAt: true,
      notas: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { texto: true, tipo: true, createdAt: true },
      },
    },
  });

  const hasMore = leads.length > limit;
  const page = hasMore ? leads.slice(0, limit) : leads;

  return apiOk({
    leads: page.map((l) => ({
      id: l.id,
      nomeCompleto: l.nomeCompleto,
      email: l.email,
      telefone: l.telefone,
      cidade: l.cidade,
      estado: l.estado,
      etapa: l.etapa,
      situacao: l.situacao,
      origem: l.origem,
      leadFrio: l.leadFrio,
      optIn: l.optIn,
      ultimoContato: l.ultimoContato,
      proximaAcao: l.proximaAcao,
      createdAt: l.createdAt,
      ultimaNota: l.notas[0] ?? null,
    })),
    pagination: {
      hasMore,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    },
  });
}
