// GET /api/public/branding
// Campos de visual usados na tela de login (pré-autenticação) — sem sessão.
// Expõe só o necessário para a marca (nada sensível: sem tokens, CNPJ, endereço etc).
export const dynamic = "force-dynamic";
import { getSystemConfig } from "@/lib/getConfig";
import { NextResponse } from "next/server";

const DEFAULT_BRANDING = {
  nomeFantasia: "Smarter Estágios",
  loginTitulo: "Smarter Estágios",
  loginSubtitulo: "Sistema de Gestão de Estágios",
  loginSlogan: "Plataforma completa para franqueadoras, franqueados, empresas e estudantes.",
  loginLogoUrl: "",
  loginBgUrl: "",
};

export async function GET() {
  const config = await getSystemConfig();
  if (!config) return NextResponse.json({ config: DEFAULT_BRANDING });

  return NextResponse.json({
    config: {
      nomeFantasia: config.nomeFantasia || DEFAULT_BRANDING.nomeFantasia,
      loginTitulo: config.loginTitulo || DEFAULT_BRANDING.loginTitulo,
      loginSubtitulo: config.loginSubtitulo || DEFAULT_BRANDING.loginSubtitulo,
      loginSlogan: config.loginSlogan || DEFAULT_BRANDING.loginSlogan,
      loginLogoUrl: config.loginLogoUrl || "",
      loginBgUrl: config.loginBgUrl || "",
    },
  });
}
