// POST /api/ies/[token]/assinar — registra assinatura eletrônica ou notifica minuta própria
// Rota PÚBLICA — a IES não tem login no sistema

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { enviarConvenioFirmadoIES, enviarMiniutaPropriaParaSmarter } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Gera senha legível tipo "SMTR-A3F-9K2"
function gerarSenhaPortal(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n: number) => Array.from({ length: n }, () => chars[crypto.randomInt(chars.length)]).join("");
  return `SMTR-${seg(3)}-${seg(3)}`;
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const body = await req.json();
    const minutaPropria: boolean = !!body.minutaPropria;

    // Validações obrigatórias (comuns a ambos os fluxos)
    if (!body.assinanteName?.trim()) return NextResponse.json({ error: "Nome do representante é obrigatório." }, { status: 400 });
    if (!body.assinanteCpf?.trim()) return NextResponse.json({ error: "CPF do representante é obrigatório." }, { status: 400 });
    if (!body.assinanteEmail?.trim()) return NextResponse.json({ error: "E-mail do representante é obrigatório." }, { status: 400 });

    // Validações específicas do fluxo Smarter
    if (!minutaPropria) {
      if (!body.confirmaLeitura) return NextResponse.json({ error: "É necessário confirmar a leitura da minuta." }, { status: 400 });
      if (!body.confirmaAutoridade) return NextResponse.json({ error: "É necessário confirmar que possui autoridade para assinar." }, { status: 400 });
    }

    // Buscar IES pelo token
    const institution = await prisma.institution.findUnique({ where: { token: params.token } });
    if (!institution) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });
    if (institution.convenioStatus === "FIRMADO") {
      return NextResponse.json({ error: "Este convênio já foi assinado anteriormente." }, { status: 409 });
    }
    if (institution.convenioStatus === "CANCELADO") {
      return NextResponse.json({ error: "Este convite foi cancelado. Entre em contato com a Smarter Estágios." }, { status: 410 });
    }

    // Captura IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "IP não capturado";
    const userAgent = req.headers.get("user-agent") || "";
    const agora = new Date();

    const portalUrl = `${req.headers.get("origin") || process.env.NEXTAUTH_URL || "https://sistema.smarterestagios.com.br"}/ies/${params.token}`;

    // ── FLUXO: Minuta Própria da IES ─────────────────────────────────────
    if (minutaPropria) {
      const assinaturaLog = {
        timestamp: agora.toISOString(),
        ip,
        userAgent,
        assinanteName: body.assinanteName.trim(),
        assinanteEmail: body.assinanteEmail.trim().toLowerCase(),
        assinanteCpf: body.assinanteCpf.replace(/\D/g, ""),
        nomeInstituicao: institution.name,
        cnpjInstituicao: institution.cnpj || "",
        fluxo: "MINUTA_PROPRIA",
        tokenUsado: params.token,
      };

      await prisma.institution.update({
        where: { token: params.token },
        data: {
          convenioStatus: "AGUARDANDO_MINUTA",
          convenioAssinadoEm: agora,
          assinanteName: body.assinanteName.trim(),
          assinanteEmail: body.assinanteEmail.trim().toLowerCase(),
          assinanteCpf: body.assinanteCpf.replace(/\D/g, ""),
          assinanteIp: ip,
          assinanteUserAgent: userAgent,
          assinaturaLog,
        },
      });

      // Notificar equipe de convênios
      enviarMiniutaPropriaParaSmarter({
        nomeIES: institution.name,
        emailIES: body.assinanteEmail.trim().toLowerCase(),
        assinanteName: body.assinanteName.trim(),
        assinanteCpf: body.assinanteCpf,
        observacao: body.observacao || "",
        portalUrl,
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        minutaPropria: true,
        message: "Solicitação registrada! Nossa equipe entrará em contato para tratar a minuta da sua instituição.",
      });
    }

    // ── FLUXO: Assinatura Minuta Smarter ────────────────────────────────
    const assinaturaLog = {
      timestamp: agora.toISOString(),
      ip,
      userAgent,
      assinanteName: body.assinanteName.trim(),
      assinanteEmail: body.assinanteEmail.trim().toLowerCase(),
      assinanteCpf: body.assinanteCpf.replace(/\D/g, ""),
      nomeInstituicao: institution.name,
      cnpjInstituicao: institution.cnpj || "",
      confirmaLeitura: body.confirmaLeitura,
      confirmaAutoridade: body.confirmaAutoridade,
      tokenUsado: params.token,
    };

    // Gerar credenciais de acesso ao portal
    const senhaPlain = gerarSenhaPortal();
    const senhaHash = await bcrypt.hash(senhaPlain, 10);

    const updated = await prisma.institution.update({
      where: { token: params.token },
      data: {
        convenioStatus: "FIRMADO",
        convenioAssinadoEm: agora,
        assinanteName: body.assinanteName.trim(),
        assinanteEmail: body.assinanteEmail.trim().toLowerCase(),
        assinanteCpf: body.assinanteCpf.replace(/\D/g, ""),
        assinanteIp: ip,
        assinanteUserAgent: userAgent,
        assinaturaLog,
        portalSenha: senhaHash,
      } as any,
    });

    const protocolo = Buffer.from(`${institution.id}|${agora.toISOString()}`).toString("base64").slice(0, 24).toUpperCase();

    // Buscar config Smarter para nome no email
    const config = await prisma.systemConfig.findUnique({ where: { id: "default" }, select: { nomeFantasia: true } });

    // Email de confirmação com credenciais (não-blocante)
    enviarConvenioFirmadoIES({
      email: body.assinanteEmail.trim().toLowerCase(),
      nomeIES: institution.name,
      assinanteName: body.assinanteName.trim(),
      protocolo,
      portalUrl,
      nomeSmarter: config?.nomeFantasia || "Smarter Estágios",
      senhaPortal: senhaPlain,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: "Convênio assinado com sucesso!",
      convenioAssinadoEm: updated.convenioAssinadoEm,
      protocolo,
    });
  } catch (e) {
    return handleApiError(e, "IES_ASSINAR_POST");
  }
}
