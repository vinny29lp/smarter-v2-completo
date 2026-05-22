export const dynamic = "force-dynamic";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearConfigCache } from "@/lib/getConfig";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

function maskToken(token?: string | null): string {
  if (!token || token.length < 8) return token || "";
  return token.slice(0, 6) + "*".repeat(token.length - 10) + token.slice(-4);
}

export async function GET() {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await prisma.systemConfig.create({ data: { id: "default" } });
    }
    const safe = {
      ...config,
      autentiqueToken: config.autentiqueToken ? maskToken(config.autentiqueToken) : "",
      resendApiKey: config.resendApiKey ? maskToken(config.resendApiKey) : "",
      autentiqueConectado: !!config.autentiqueToken,
      resendConectado: !!config.resendApiKey,
    };
    return NextResponse.json({ config: safe });
  } catch {
    return NextResponse.json({ config: {
      nomeFantasia: "Smarter Estágios", slogan: "Gestão completa de estágios",
      loginTitulo: "Smarter Estágios", loginSubtitulo: "Sistema de Gestão de Estágios",
      loginSlogan: "Plataforma completa para franqueadoras, franqueados, empresas e estudantes.",
      loginLogoUrl: "", loginBgUrl: "", logoDocUrl: "", watermarkUrl: "", watermarkText: "SMARTER",
      razaoSocial: "Smarter Estágios Agente de Integração Ltda.",
      cnpj: "", endereco: "", cidade: "", uf: "SP", telefone: "", email: "",
      responsavel: "", pix: "", apolice: "", seguradora: "",
      autentiqueToken: "", resendApiKey: "",
      autentiqueConectado: false, resendConectado: false,
    }});
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Apenas a Franqueadora pode editar configurações." }, { status: 403 });
  }
  const body = await req.json();

  // Strip masked values — if a field contains "***", don't overwrite the real token
  const safeBody: any = { ...body };
  if (safeBody.autentiqueToken?.includes("*")) delete safeBody.autentiqueToken;
  if (safeBody.resendApiKey?.includes("*")) delete safeBody.resendApiKey;
  // Remove computed fields
  delete safeBody.autentiqueConectado;
  delete safeBody.resendConectado;

  const config = await prisma.systemConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...safeBody },
    update: safeBody,
  });

  // Clear in-memory cache so lib functions pick up new tokens immediately
  clearConfigCache();

  return NextResponse.json({ config });
}
