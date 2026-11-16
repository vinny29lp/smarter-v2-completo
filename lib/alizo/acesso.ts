/**
 * Autorização das rotas locais da integração Alizo. A unidade vem SEMPRE da sessão (nunca de orgId/unit do navegador):
 * franqueado/funcionário só enxergam a própria franquia; franqueadora/equipe podem indicar a franquia-alvo,
 * que precisa existir na tabela de vínculos. Também aplica limite simples de requisições por usuário.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const janela = new Map<string, { n: number; ate: number }>();
/** Máx. `max` chamadas por minuto por usuário+rota (memória da instância; proteção básica contra abuso). */
export function limitar(chave: string, max = 40): boolean {
  const agora = Date.now();
  const j = janela.get(chave);
  if (!j || j.ate < agora) { janela.set(chave, { n: 1, ate: agora + 60_000 }); return true; }
  j.n++;
  return j.n <= max;
}

export type CtxAlizo =
  | { erro: NextResponse }
  | { role: string; admin: boolean; userId: string; franchiseId: string | null; userName: string };

export async function contextoAlizo(opts: { soAdmin?: boolean; rota: string; max?: number }): Promise<CtxAlizo> {
  const session = await getServerSession(authOptions);
  if (!session) return { erro: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = session.user.role || "";
  const admin = role === "FRANQUEADORA";
  const equipe = role === "EQUIPE";
  const unidade = role === "FRANQUEADO" || role === "FUNCIONARIO";
  if (opts.soAdmin ? !admin : !(admin || equipe || unidade)) return { erro: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const userId = (session.user as any).id || session.user.email || "u";
  if (!limitar(`${userId}:${opts.rota}`, opts.max)) return { erro: NextResponse.json({ error: "Muitas requisições. Aguarde um instante." }, { status: 429 }) };
  const fid = (session.user as any).franchiseId as string | undefined;
  return { role, admin, userId, franchiseId: unidade ? (fid && fid !== "FRANQUEADORA" ? fid : null) : null, userName: session.user.name || "" };
}

/** Franquia-alvo: da sessão para unidade; do corpo/consulta para franqueadora/equipe (validada). */
export function franquiaAlvo(ctx: Exclude<CtxAlizo, { erro: NextResponse }>, pedida?: string | null): string | null {
  if (ctx.franchiseId) return ctx.franchiseId;
  return ctx.role === "FRANQUEADORA" || ctx.role === "EQUIPE" ? (pedida || null) : null;
}

/** Vínculo da franquia com a Alizo (null se ainda não sincronizada). */
export async function vinculoDaFranquia(franchiseId: string) {
  return prisma.alizoUnidade.findUnique({ where: { franchiseKey: franchiseId } });
}
