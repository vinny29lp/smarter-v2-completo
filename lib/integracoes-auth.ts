/**
 * Controle de acesso da aba "Integração" (self-service de partner_api_tokens).
 * Mesmo padrão de FRANQUEADORA/EQUIPE-com-permissão "vê a rede toda" vs
 * FRANQUEADO/FUNCIONARIO-com-permissão "vê só a própria unidade" usado em
 * /dashboard/marketing (ver app/dashboard/marketing/trafego-pago/page.tsx).
 */
import type { Session } from "next-auth";

export function isIntegracoesAdmin(session: Session | null | undefined): boolean {
  const role = session?.user?.role;
  const permissoes = session?.user?.permissoes;
  return role === "FRANQUEADORA" || (role === "EQUIPE" && !!permissoes?.includes("integracoes"));
}

function isUnitUser(session: Session | null | undefined): boolean {
  const role = session?.user?.role;
  const permissoes = session?.user?.permissoes;
  return role === "FRANQUEADO" || (role === "FUNCIONARIO" && !!permissoes?.includes("integracoes"));
}

/**
 * Resolve qual franchiseId o usuário logado pode consultar/gerenciar.
 * - Admin de rede: pode pedir qualquer franchiseId (obrigatório informar).
 * - Usuário de unidade: só pode ver a própria unidade — ignora franchiseId
 *   pedido se vier de outra unidade.
 * Retorna null se o usuário não tem acesso nenhum a esta feature.
 */
export function resolveIntegracoesFranchiseId(
  session: Session | null | undefined,
  requestedFranchiseId: string | null
): string | null {
  if (!session?.user) return null;

  if (isIntegracoesAdmin(session)) {
    return requestedFranchiseId || null;
  }

  if (isUnitUser(session)) {
    const own = session.user.franchiseId;
    if (!own || own === "FRANQUEADORA") return null;
    if (requestedFranchiseId && requestedFranchiseId !== own) return null;
    return own;
  }

  return null;
}
