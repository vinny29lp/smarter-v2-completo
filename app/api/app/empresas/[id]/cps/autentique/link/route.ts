import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { criarLinkAssinatura } from "@/lib/autentique";
import { checkPermission } from "@/lib/permissions";

/**
 * Gera (sob demanda) o link de assinatura de um signatário específico do
 * CPS, pra copiar/enviar manualmente por WhatsApp ou reenviar por e-mail —
 * mesmo padrão já usado pros documentos de contrato (ver
 * app/api/app/contratos/[id]/documentos/[docId]/autentique/link/route.ts).
 * O campo `link` retornado pelas queries de status do Autentique não vem
 * preenchido pra signatários cadastrados por e-mail (nosso caso, sempre)
 * — só é possível pedir o link explicitamente, por signatário, via esta
 * mutation (ver lib/autentique.ts:criarLinkAssinatura).
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  try {
    const body = await req.json();
    const publicId: string | undefined = body?.publicId;
    if (!publicId) {
      return NextResponse.json({ error: "publicId do signatário é obrigatório." }, { status: 400 });
    }

    const empresa = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true, franchiseId: true, cpsAuthDocId: true } as any,
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }
    // SEC: escopo por franquia — mesmo padrão das outras rotas de CPS.
    if (session.user.role !== "FRANQUEADORA" && (empresa as any).franchiseId !== session.user.franchiseId) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }
    if (!(empresa as any).cpsAuthDocId) {
      return NextResponse.json({ error: "CPS ainda não foi enviado para o Autentique." }, { status: 400 });
    }

    const shortLink = await criarLinkAssinatura(publicId);
    return NextResponse.json({ ok: true, shortLink });
  } catch (err: any) {
    console.error("[CPS Autentique/link] Error:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao gerar link de assinatura." },
      { status: 500 }
    );
  }
}
