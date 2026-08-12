/**
 * POST /api/app/empresas/[id]/proposta
 *
 * Gera (ou reaproveita) o link público da proposta comercial para a empresa,
 * salva o valor de gestão se enviado, marca ENVIADA e dispara o e-mail.
 * Body: { valorGestao?: number }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { enviarPropostaComercial } from "@/lib/email";
import { randomUUID } from "crypto";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["FRANQUEADORA", "FRANQUEADO"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const empresa = await prisma.company.findUnique({
      where: { id: params.id },
      include: { franchise: true },
    });
    if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    // SEC: escopo por franquia — unidade só envia proposta de empresa da própria franquia.
    if (session.user.role !== "FRANQUEADORA" && empresa.franchiseId !== session.user.franchiseId) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    let valorGestao = (empresa as any).valorGestao as number | null;
    if (body.valorGestao !== undefined) {
      if (!body.valorGestao || isNaN(Number(body.valorGestao))) {
        return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
      }
      valorGestao = Number(body.valorGestao);
    }
    if (!valorGestao) {
      return NextResponse.json({ error: "Defina o valor de gestão por estagiário antes de enviar a proposta." }, { status: 400 });
    }

    if (!empresa.email) {
      return NextResponse.json({ error: "Empresa sem e-mail cadastrado." }, { status: 400 });
    }

    // Reaproveita token existente para não invalidar um link já enviado — só gera se ainda não houver.
    const token = (empresa as any).proposalToken || randomUUID();

    await prisma.company.update({
      where: { id: params.id },
      data: {
        valorGestao,
        proposalToken: token,
        proposalStatus: "ENVIADA",
        proposalSentAt: new Date(),
      } as any,
    });

    const sent = await enviarPropostaComercial({
      email: empresa.email,
      empresa: empresa.name,
      responsavel: empresa.responsavel || undefined,
      valorGestao,
      nomeUnidade: empresa.franchise?.name || "Smarter Estágios",
      responsavelUnidade: empresa.franchise?.responsavel,
      cidade: empresa.franchise ? `${empresa.franchise.cidade}/${empresa.franchise.uf}` : undefined,
      token,
    });

    if (!sent) {
      return NextResponse.json({ error: "Proposta salva, mas falhou o envio do e-mail. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, token, link: `${appUrl}/proposta/${token}` });
  } catch (e) {
    return handleApiError(e, "EMPRESA_PROPOSTA_POST");
  }
}
