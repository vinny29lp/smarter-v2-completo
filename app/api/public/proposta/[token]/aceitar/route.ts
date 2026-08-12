/**
 * POST /api/public/proposta/[token]/aceitar
 *
 * Endpoint público chamado quando a empresa aceita a proposta comercial.
 * Não requer autenticação — o token é o "ingresso".
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const ip = getClientIpFromRequest(req);
  if (!checkRateLimit(ip, "public_proposta_aceitar", 10, 60_000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
      { status: 429 }
    );
  }

  const { token } = params;
  if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 400 });

  const empresa = await prisma.company.findUnique({
    where: { proposalToken: token } as any,
    select: { id: true, proposalStatus: true },
  });
  if (!empresa) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });

  if ((empresa as any).proposalStatus !== "ACEITA") {
    await prisma.company.update({
      where: { id: empresa.id },
      data: { proposalStatus: "ACEITA", proposalRespondedAt: new Date() } as any,
    });
  }

  return NextResponse.json({ ok: true });
}
