/**
 * POST /api/app/integracoes/token
 * Gera (ou regenera) o token de parceiro de uma unidade para um escopo
 * ("crm" | "recruitment"), usado pela aba "Integração" para fechar o loop
 * de conexão self-service com o AI Workforce OS/Alizo — hoje esses tokens
 * só existiam via INSERT manual em partner_api_tokens.
 *
 * O token é retornado em texto puro só nesta resposta: tokenHash é SHA-256
 * one-way (ver lib/partner-auth.ts), então depois de gerado não há como
 * mostrá-lo de novo — regenerar é a única forma de "recuperar" o acesso.
 * Regenerar sobrescreve o tokenHash da linha existente, o que invalida
 * imediatamente o token anterior (o hash antigo deixa de bater com
 * qualquer linha na tabela).
 */
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErr, apiOk } from "@/lib/api-response";
import { logAudit, getClientIP } from "@/lib/audit";
import { hashPartnerToken, type PartnerScope } from "@/lib/partner-auth";
import { resolveIntegracoesFranchiseId, isIntegracoesAdmin } from "@/lib/integracoes-auth";

export const dynamic = "force-dynamic";

const SCOPE_LABEL: Record<string, string> = {
  crm: "CRM de Vendas",
  recruitment: "Recrutamento",
  marketing: "Tráfego Pago",
  franquia_crm: "CRM de Franquias (rede)",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => ({}));

  const scope = body.scope as PartnerScope;
  if (scope !== "crm" && scope !== "recruitment" && scope !== "marketing" && scope !== "franquia_crm") {
    return apiErr("Escopo inválido.", 400, "INVALID_SCOPE");
  }

  // "franquia_crm" é nível rede — não pertence a nenhuma franquia (FranquiaLead
  // não tem franchiseId, ver migration add_franquia_crm_partner_scope) — só a
  // franqueadora pode gerar, e o token nasce sem franchiseId (null).
  if (scope === "franquia_crm") {
    if (!isIntegracoesAdmin(session)) {
      return apiErr("Não autorizado.", 403, "FORBIDDEN");
    }

    const existing = (
      await prisma.partnerApiToken.findMany({
        where: { franchiseId: null },
        select: { id: true, scopes: true },
      })
    ).find(r => r.scopes.length === 1 && r.scopes[0] === scope);

    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = hashPartnerToken(plainToken);
    const descricao = `${SCOPE_LABEL[scope]} — Alizo`;

    const tokenRow = existing
      ? await prisma.partnerApiToken.update({
          where: { id: existing.id },
          data: { tokenHash, ativo: true, lastUsedAt: null },
        })
      : await prisma.partnerApiToken.create({
          data: { franchiseId: null, scopes: [scope], descricao, tokenHash },
        });

    logAudit({
      userId: session!.user.id,
      role: session!.user.role,
      acao: existing ? "PARTNER_TOKEN_REGENERADO" : "PARTNER_TOKEN_GERADO",
      modulo: "integracoes",
      detalhes: `scope:${scope} (rede) | tokenId:${tokenRow.id}`,
      ip: getClientIP(req),
    });

    return apiOk({ token: plainToken, criadoEm: tokenRow.createdAt });
  }

  const franchiseId = resolveIntegracoesFranchiseId(session, body.franchiseId || null);
  if (!franchiseId) {
    return apiErr("Não autorizado.", 403, "FORBIDDEN");
  }

  const existing = (
    await prisma.partnerApiToken.findMany({
      where: { franchiseId },
      select: { id: true, scopes: true },
    })
  ).find(r => r.scopes.length === 1 && r.scopes[0] === scope);

  const plainToken = randomBytes(32).toString("hex");
  const tokenHash = hashPartnerToken(plainToken);
  const descricao = `${SCOPE_LABEL[scope]} — Alizo`;

  const tokenRow = existing
    ? await prisma.partnerApiToken.update({
        where: { id: existing.id },
        data: { tokenHash, ativo: true, lastUsedAt: null },
      })
    : await prisma.partnerApiToken.create({
        data: { franchiseId, scopes: [scope], descricao, tokenHash },
      });

  logAudit({
    userId: session!.user.id,
    role: session!.user.role,
    franchiseId,
    acao: existing ? "PARTNER_TOKEN_REGENERADO" : "PARTNER_TOKEN_GERADO",
    modulo: "integracoes",
    detalhes: `scope:${scope} | tokenId:${tokenRow.id}`,
    ip: getClientIP(req),
  });

  return apiOk({ token: plainToken, criadoEm: tokenRow.createdAt });
}
