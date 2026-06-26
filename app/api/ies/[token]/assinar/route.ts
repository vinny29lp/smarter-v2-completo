// POST /api/ies/[token]/assinar — registra assinatura eletrônica da minuta de convênio
// Rota PÚBLICA — a IES não tem login no sistema

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const body = await req.json();

    // Validações mínimas obrigatórias
    if (!body.assinanteName?.trim()) return NextResponse.json({ error: "Nome do assinante é obrigatório." }, { status: 400 });
    if (!body.assinanteCpf?.trim()) return NextResponse.json({ error: "CPF do assinante é obrigatório." }, { status: 400 });
    if (!body.assinanteEmail?.trim()) return NextResponse.json({ error: "E-mail do assinante é obrigatório." }, { status: 400 });
    if (!body.confirmaLeitura) return NextResponse.json({ error: "É necessário confirmar a leitura da minuta." }, { status: 400 });
    if (!body.confirmaAutoridade) return NextResponse.json({ error: "É necessário confirmar que possui autoridade para assinar." }, { status: 400 });

    // Buscar IES pelo token
    const institution = await prisma.institution.findUnique({ where: { token: params.token } });
    if (!institution) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });
    if (institution.convenioStatus === "FIRMADO") {
      return NextResponse.json({ error: "Este convênio já foi assinado anteriormente." }, { status: 409 });
    }
    if (institution.convenioStatus === "CANCELADO") {
      return NextResponse.json({ error: "Este convite foi cancelado. Entre em contato com a Smarter Estágios." }, { status: 410 });
    }

    // Captura IP (encaminhado pelo Vercel via headers)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "IP não capturado";
    const userAgent = req.headers.get("user-agent") || "";
    const agora = new Date();

    // Log completo da assinatura (auditoria legal)
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

    // Atualizar institution com dados da assinatura
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
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Convênio assinado com sucesso!",
      convenioAssinadoEm: updated.convenioAssinadoEm,
      protocolo: Buffer.from(`${institution.id}|${agora.toISOString()}`).toString("base64").slice(0, 24).toUpperCase(),
    });
  } catch (e) {
    return handleApiError(e, "IES_ASSINAR_POST");
  }
}
