/**
 * GET /api/app/universidade/entrar — login único na Universidade Smarter.
 * Qualquer usuário logado no sistema (inclusive unidade em treinamento obrigatório) é levado
 * à universidade já autenticado, com o mesmo e-mail do painel.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { universidadeConfigurada, urlDeEntrada, UNIVERSIDADE_URL } from "@/lib/universidade";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.redirect(new URL("/login", req.url));
  if (!universidadeConfigurada()) return NextResponse.redirect(UNIVERSIDADE_URL); // sem SSO: cai no login da universidade
  const destino = urlDeEntrada(session.user.email, session.user.name || "");
  return NextResponse.redirect(destino, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
