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

// ── ESC-006: CSP com nonce por request ───────────────────────────────────
// Nonce gerado por requisição — impede injeção de scripts não autorizados (XSS).
// 'strict-dynamic' permite que scripts carregados por scripts nonce'd também rodem
// (necessário para o runtime do Next.js funcionar sem 'unsafe-inline').
// 'unsafe-inline' em style-src: aceitável (CSS não executa código; Tailwind precisa disso).
// blob: e data: em img-src: necessário para PDFs (URL.createObjectURL + base64).
// frame-src 'self' blob:: necessário para iframe com srcDoc (documentos de contrato).
// allowEmbedding: permite que /vagas seja embutido em iframe no site institucional.
function buildCsp(nonce: string, allowEmbedding = false): string {
  const frameAncestors = allowEmbedding
    ? `frame-ancestors 'self' https://smarterestagios.com.br`
    : `frame-ancestors 'none'`;
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `frame-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    frameAncestors,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const t0 = Date.now();
  const { pathname } = req.nextUrl;

  // ── ESC-006: Gerar nonce por request e propagar headers ──────────────
  // /vagas é a página pública de vagas — permitida em iframe no site institucional
  const allowEmbedding = pathname === "/vagas";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp   = buildCsp(nonce, allowEmbedding);

  // Propaga nonce para Server Components lerem via next/headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Rotas estáticas e de API não precisam de auth redirect — só aplicamos CSP
  const isProtectedRoute =
    pathname === "/dashboard"          || pathname.startsWith("/dashboard/") ||
    pathname === "/portal-empresa"     || pathname.startsWith("/portal-empresa/") ||
    pathname === "/portal-estudante"   || pathname.startsWith("/portal-estudante/");

  // Função auxiliar: retorna resposta com CSP e nonce injetados
  function withCsp(resp: NextResponse): NextResponse {
    resp.headers.set("Content-Security-Policy", csp);
    return resp;
  }

  if (!isProtectedRoute) {
    // Rotas públicas (login, lead, api/public, etc.) — apenas CSP, sem auth check
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // ── Auth: protege rotas privadas ──────────────────────────────────────
  // getToken() lê o JWT do cookie e verifica assinatura — sem acesso ao banco
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role  = (token?.role as string) || "";

  console.log(`[MIDDLEWARE_PERF] ${pathname} — getToken: ${Date.now()-t0}ms — role=${role||"none"}`);

  // ── Não autenticado → login (preserva URL original como callbackUrl) ──
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    const dest = pathname + req.nextUrl.search;
    if (dest !== "/" && dest !== "/login") loginUrl.searchParams.set("callbackUrl", dest);
    return withCsp(NextResponse.redirect(loginUrl));
  }

  // ── /dashboard (raiz e sub-rotas) ────────────────────────────────────
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (role === "EMPRESA")   return withCsp(NextResponse.redirect(new URL("/portal-empresa",   req.url)));
    if (role === "ESTUDANTE") return withCsp(NextResponse.redirect(new URL("/portal-estudante", req.url)));

    // FUNCIONARIO: verifica se tem permissão para a rota acessada
    if (role === "FUNCIONARIO") {
      const permissoes: string[] = (token.permissoes as string[]) ?? [];
      if (pathname !== "/dashboard") {
        const requiredPerm = Object.entries(FUNCIONARIO_ROUTE_PERMS).find(
          ([route]) => pathname === route || pathname.startsWith(route + "/")
        )?.[1];
        if (requiredPerm && !permissoes.includes(requiredPerm)) {
          return withCsp(NextResponse.redirect(new URL("/dashboard", req.url)));
        }
      }
    }

    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // ── /portal-empresa (raiz e sub-rotas) ───────────────────────────────
  if (pathname === "/portal-empresa" || pathname.startsWith("/portal-empresa/")) {
    if (role === "EMPRESA") return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
    if (
      (role === "FRANQUEADO" || role === "FRANQUEADORA" || role === "FUNCIONARIO") &&
      (pathname === "/portal-empresa/avaliacoes" || pathname.startsWith("/portal-empresa/avaliacoes"))
    ) return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
    if (role === "ESTUDANTE") return withCsp(NextResponse.redirect(new URL("/portal-estudante", req.url)));
    if (role === "FRANQUEADO" || role === "FRANQUEADORA") return withCsp(NextResponse.redirect(new URL("/dashboard", req.url)));
    return withCsp(NextResponse.redirect(new URL("/login", req.url)));
  }

  // ── /portal-estudante (raiz e sub-rotas) ─────────────────────────────
  if (pathname === "/portal-estudante" || pathname.startsWith("/portal-estudante/")) {
    if (role === "ESTUDANTE") return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
    if (role === "EMPRESA")   return withCsp(NextResponse.redirect(new URL("/portal-empresa",   req.url)));
    if (role === "FRANQUEADO" || role === "FRANQUEADORA") return withCsp(NextResponse.redirect(new URL("/dashboard", req.url)));
    return withCsp(NextResponse.redirect(new URL("/login", req.url)));
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  // ESC-006: matcher expandido para todas as rotas HTML — garante CSP em toda a app.
  // Exclui: arquivos estáticos (_next/static, _next/image), favicon e ícones.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon-|apple-touch-icon|manifest\\.json).*)",
  ],
};
