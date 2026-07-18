/**
 * GET /api/app/integracoes/unidades
 * Lista as unidades (franquias) da rede — usada pelo seletor de unidade
 * na aba Integração, visível só para FRANQUEADORA/EQUIPE com permissão.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErr, apiOk } from "@/lib/api-response";
import { isIntegracoesAdmin } from "@/lib/integracoes-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isIntegracoesAdmin(session)) {
    return apiErr("Não autorizado.", 403, "FORBIDDEN");
  }

  const unidades = await prisma.franchise.findMany({
    select: { id: true, name: true, cidade: true, uf: true },
    orderBy: { name: "asc" },
  });

  return apiOk({ unidades });
}
