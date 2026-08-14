/**
 * GET /api/app/integracoes?franchiseId=X
 * Status dos tokens de parceiro (partner_api_tokens) da unidade, para a aba
 * "Integração" (self-service de conexão com o AI Workforce OS/Alizo).
 * Nunca retorna o token em si — tokenHash é SHA-256 one-way, então o valor
 * só existe em texto puro no momento em que é gerado (ver POST /token).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErr, apiOk } from "@/lib/api-response";
import { resolveIntegracoesFranchiseId, isIntegracoesAdmin } from "@/lib/integracoes-auth";

export const dynamic = "force-dynamic";

function tokenStatus(rows: { scopes: string[]; ativo: boolean; createdAt: Date | null; lastUsedAt: Date | null }[], scope: string) {
  const row = rows.find(r => r.scopes.length === 1 && r.scopes[0] === scope);
  if (!row) return { existe: false, ativo: false, criadoEm: null, ultimoUso: null };
  return { existe: true, ativo: row.ativo, criadoEm: row.createdAt, ultimoUso: row.lastUsedAt };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("franchiseId");

  const franchiseId = resolveIntegracoesFranchiseId(session, requested);
  if (!franchiseId) {
    return apiErr("Não autorizado.", 403, "FORBIDDEN");
  }

  const franchise = await prisma.franchise.findUnique({
    where: { id: franchiseId },
    select: { id: true, name: true, cidade: true, uf: true },
  });
  if (!franchise) {
    return apiErr("Unidade não encontrada.", 404, "NOT_FOUND");
  }

  const admin = isIntegracoesAdmin(session);

  const [tokens, empresas, networkTokens] = await Promise.all([
    prisma.partnerApiToken.findMany({
      where: { franchiseId },
      select: { scopes: true, ativo: true, createdAt: true, lastUsedAt: true },
    }),
    // Só empresas da PRÓPRIA unidade — empresas migradas (franchiseId null,
    // visíveis a todos) não passam no ownership check de /api/partners/vacancies,
    // então não fazem sentido aqui como company_id para a Alizo colar.
    prisma.company.findMany({
      where: { franchiseId },
      select: { id: true, name: true, cnpj: true },
      orderBy: { name: "asc" },
    }),
    // "CRM de Franquias" é nível rede (franchiseId null), não desta unidade —
    // só faz sentido pra quem administra a rede toda, independente de qual
    // unidade está selecionada no seletor da tela.
    admin
      ? prisma.partnerApiToken.findMany({
          where: { franchiseId: null },
          select: { scopes: true, ativo: true, createdAt: true, lastUsedAt: true },
        })
      : Promise.resolve([]),
  ]);

  return apiOk({
    franchise,
    crm: tokenStatus(tokens, "crm"),
    recruitment: tokenStatus(tokens, "recruitment"),
    marketing: tokenStatus(tokens, "marketing"),
    ...(admin ? { franquiaCrm: tokenStatus(networkTokens, "franquia_crm") } : {}),
    empresas,
  });
}
