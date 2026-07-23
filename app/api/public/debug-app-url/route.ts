// GET /api/public/_debug-app-url
// Diagnostico TEMPORARIO — nao expoe nada sensivel (so URLs de dominio).
// Remover apos confirmar a causa do link errado no e-mail de prospeccao.
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const rawNextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL || null;
  const rawNextauthUrl = process.env.NEXTAUTH_URL || null;

  const _rawAppUrl = rawNextPublicAppUrl || rawNextauthUrl || "";
  const computedAppUrl = (_rawAppUrl && !_rawAppUrl.includes("localhost") && !_rawAppUrl.includes("127.0.0"))
    ? _rawAppUrl.replace(/\/$/, "")
    : "https://sistema.smarterestagios.com.br";

  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: rawNextPublicAppUrl,
    NEXTAUTH_URL: rawNextauthUrl,
    computedAppUrl,
    VERCEL_ENV: process.env.VERCEL_ENV || null,
    VERCEL_URL: process.env.VERCEL_URL || null,
  });
}
