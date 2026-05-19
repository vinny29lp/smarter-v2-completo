import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Buscar token diretamente — sem withAuth para evitar double-redirect
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role  = (token?.role as string) || "";

  // ── Não autenticado → login ──────────────────────────────────────────
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── /dashboard (raiz e sub-rotas) ────────────────────────────────────
  // Só FRANQUEADO e FRANQUEADORA podem estar aqui
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (role === "EMPRESA")   return NextResponse.redirect(new URL("/portal-empresa",   req.url));
    if (role === "ESTUDANTE") return NextResponse.redirect(new URL("/portal-estudante", req.url));
    return NextResponse.next(); // FRANQUEADO / FRANQUEADORA: ok
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
