// GET  /api/ies  — lista convites IES (dashboard)
// POST /api/ies  — cria novo convite IES e gera token único

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { enviarConviteIES } from "@/lib/email";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role;
    const franchiseId = session.user.franchiseId;

    // FRANQUEADORA vê todas; FRANQUEADO vê só as suas
    const where: any = { token: { not: null } };
    if (role === "FRANQUEADO" || role === "FUNCIONARIO") {
      where.franchiseId = franchiseId ?? "none";
    } else if (role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const institutions = await prisma.institution.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, cnpj: true, email: true, cidade: true, uf: true,
        token: true, convenioStatus: true, convenioAssinadoEm: true,
        conviteEnviadoEm: true, assinanteName: true, franchiseId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ institutions });
  } catch (e) {
    return handleApiError(e, "IES_GET");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role;
    if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role || "")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || !body.email) {
      return NextResponse.json({ error: "Nome e e-mail da IES são obrigatórios." }, { status: 400 });
    }

    // Token único e curto (hex 12 bytes = 24 chars), suficiente para URL segura
    const token = crypto.randomBytes(12).toString("hex");

    const institution = await prisma.institution.create({
      data: {
        name: body.name,
        razaoSocial: body.razaoSocial || null,
        cnpj: body.cnpj || null,
        tipo: body.tipo || "SUPERIOR",
        email: body.email,
        telefone: body.telefone || null,
        coordenador: body.coordenador || null,
        cargoCoord: body.cargoCoord || null,
        cidade: body.cidade || null,
        uf: body.uf || null,
        endereco: body.endereco || null,
        cep: body.cep || null,
        site: body.site || null,
        token,
        franchiseId: role === "FRANQUEADORA" ? null : (session.user.franchiseId ?? null),
        convenioStatus: "PENDENTE",
        conviteEnviadoEm: new Date(),
        conviteEnviadoPor: session.user.id,
      },
    });

    // Buscar configuração do sistema para montar o link
    const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "https://sistema.smarterestagios.com.br";
    const portalUrl = `${appUrl}/ies/${token}`;

    // Enviar e-mail de convite para a IES
    let emailEnviado = false;
    let emailErro = "";
    try {
      emailEnviado = await enviarConviteIES({
        email: body.email,
        nomeIES: body.name,
        coordenador: body.coordenador || "",
        portalUrl,
        nomeUnidade: session.user.name || config?.nomeFantasia || "Smarter Estágios",
      });
      if (!emailEnviado) emailErro = "Resend retornou erro. Verifique RESEND_API_KEY.";
    } catch (err: any) {
      emailErro = err?.message || "Exceção ao enviar e-mail";
      console.error("[IES] Erro ao enviar convite:", err);
    }

    return NextResponse.json({ institution, portalUrl, emailEnviado, emailErro: emailEnviado ? undefined : emailErro });
  } catch (e) {
    return handleApiError(e, "IES_POST");
  }
}
