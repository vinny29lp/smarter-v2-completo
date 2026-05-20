export const dynamic = "force-dynamic";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

// Buscar config (qualquer role autenticado pode ler — login usa sem autenticação)
export async function GET() {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await prisma.systemConfig.create({ data: { id: "default" } });
    }
    return NextResponse.json({ config });
  } catch {
    // Tabela ainda não existe — retornar defaults
    return NextResponse.json({ config: {
      nomeFantasia: "Smarter Estágios", slogan: "Gestão completa de estágios",
      loginTitulo: "Smarter Estágios", loginSubtitulo: "Sistema de Gestão de Estágios",
      loginSlogan: "Plataforma completa para franqueadoras, franqueados, empresas e estudantes.",
      loginLogoUrl: "", loginBgUrl: "", logoDocUrl: "", watermarkUrl: "", watermarkText: "SMARTER",
      razaoSocial: "Smarter Estágios Agente de Integração Ltda.", cnpj: "", endereco: "",
      cidade: "", uf: "SP", telefone: "", email: "", responsavel: "", pix: "", apolice: "", seguradora: "",
    }});
  }
}

// Salvar config (apenas FRANQUEADORA)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Apenas a Franqueadora pode editar configurações." }, { status: 403 });
  }
  const body = await req.json();
  const config = await prisma.systemConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...body },
    update: body,
  });
  return NextResponse.json({ config });
}
