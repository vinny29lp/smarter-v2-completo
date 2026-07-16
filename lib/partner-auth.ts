/**
 * Autenticação de parceiros externos escopada por franquia (PartnerApiToken).
 * Usado pelas rotas de escrita /api/partners/leads/* e /api/partners/campaigns/* —
 * diferente de PARTNER_CANDIDATES_API_TOKEN (env var global, somente leitura),
 * aqui cada franquia/unidade tem seu próprio token, guardado como hash SHA-256.
 * Um mesmo token pode ser autorizado para uma ou mais capabilities via `scopes`
 * (ex.: ["crm"], ["marketing"], ["crm","marketing"]) — evita precisar de um
 * token por capability.
 */
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export type PartnerScope = "crm" | "marketing" | "recruitment";

export function hashPartnerToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface PartnerAuthResult {
  franchiseId: string;
  tokenId: string;
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/**
 * Valida o Bearer token contra a tabela partner_api_tokens e exige que ele
 * tenha o escopo informado. Retorna a franquia à qual o token pertence,
 * ou null se inválido/inativo/sem o escopo necessário.
 */
export async function authenticatePartnerCrmToken(
  req: Request,
  requiredScope: PartnerScope = "crm"
): Promise<PartnerAuthResult | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const tokenHash = hashPartnerToken(token);
  const record = await prisma.partnerApiToken.findUnique({ where: { tokenHash } });
  if (!record || !record.ativo) return null;
  if (!record.scopes.includes(requiredScope)) return null;

  // Fire-and-forget: não bloqueia a resposta por causa do timestamp de uso
  prisma.partnerApiToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { franchiseId: record.franchiseId, tokenId: record.id };
}
