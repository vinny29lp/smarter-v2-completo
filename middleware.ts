import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Mapa: prefixo de rota → chave de permissão necessária (para FUNCIONARIO)
const FUNCIONARIO_ROUTE_PERMS: Record<string, string> = {
  "/dashboard/financeiro":    "financeiro",
  "/dashboard/contratos":     "contratos",
  "/dashboard/estudantes":    "estudantes",
  "/dashboard/empresas":      "empresas",
  "/dashboard/vagas":         "vagas",
  "/dashboard/processos":     "processos",
  "/dashboard/crm":           "crm",
  "/dashboard/instituicoes":  "instituicoes",
  "/dashboard/configuracoes": "configuracoes",
  "/dashboard/assinaturas":   "assinaturas",
};

export async function middleware(req: NextRequest) {
  const t0 = Date.now();
  const { pathname } = req.nextUrl;

  // Buscar token diretamente — sem withAuth para evitar double-redirect
  // getToken() lê o JWT do cookie e verifica assinatura — sem acesso ao banco
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role  = (token?.role as string) || "";

  console.log(`[MIDDLEWARE_PERF] ${pathname} — getToken: ${Date.now()-t0}ms — role=${role||"none"}`);

  // ── Não autenticado → login (preserva URL original como callbackUrl) ──
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    const dest = pathname + req.nextUrl.search;
    if (dest !== "/" && dest !== "/login") loginUrl.searchParams.set("callbackUrl", dest);
    return NextResponse.redirect(loginUrl);
  }

  // ── /dashboard (raiz e sub-rotas) ────────────────────────────────────
  // Só FRANQUEADO e FRANQUEADORA podem estar aqui
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (role === "EMPRESA")   return NextResponse.redirect(new URL("/portal-empresa",   req.url));
    if (role === "ESTUDANTE") return NextResponse.redirect(new URL("/portal-estudante", req.url));

    // FUNCIONARIO: verifica se tem permissão para a rota acessada
    if (role === "FUNCIONARIO") {
      const permissoes: string[] = (token.permissoes as string[]) ?? [];
      // /dashboard (raiz) sempre permitido
      if (pathname !== "/dashboard") {
        const requiredPerm = Object.entries(FUNCIONARIO_ROUTE_PERMS).find(
          ([route]) => pathname === route || pathname.startsWith(route + "/")
        )?.[1];
        if (requiredPerm && !permissoes.includes(requiredPerm)) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
    }

    return NextResponse.next(); // FRANQUEADO / FRANQUEADORA / FUNCIONARIO autorizado: ok
  }

  // ── /portal-empresa (raiz e sub-rotas) ───────────────────────────────
  // Só EMPRESA pode estar aqui — qualquer outro vai para seu lugar correto
  if (pathname === "/portal-empresa" || pathname.startsWith("/portal-empresa/")) {
    if (role === "EMPRESA") return NextResponse.next(); // ok, não redirecionar
    // Outros roles: vai para o lugar certo deles
    if (role === "ESTUDANTE")                 return NextResponse.redirect(new URL("/portal-estudante", req.url));
    if (role === "FRANQUEADO" || role === "FRANQUEADORA") return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── /portal-estudante (raiz e sub-rotas) ─────────────────────────────
  // Só ESTUDANTE pode estar aqui
  if (pathname === "/portal-estudante" || pathname.startsWith("/portal-estudante/")) {
    if (role === "ESTUDANTE") return NextResponse.next(); // ok
    if (role === "EMPRESA")                   return NextResponse.redirect(new URL("/portal-empresa",   req.url));
    if (role === "FRANQUEADO" || role === "FRANQUEADORA") return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/portal-empresa",
    "/portal-empresa/:path*",
    "/portal-estudante",
    "/portal-estudante/:path*",
  ],
};
