import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { criarLinkAssinatura } from "@/lib/autentique";

/**
 * Gera (sob demanda) o link de assinatura de um signatário específico,
 * pra copiar/enviar manualmente por WhatsApp (item pedido em 2026-08-18).
 * O campo `link` retornado pelas queries de status do Autentique não vem
 * preenchido pra signatários cadastrados por e-mail (nosso caso, sempre)
 * — só é possível pedir o link explicitamente, por signatário, via esta
 * mutation (ver lib/autentique.ts:criarLinkAssinatura).
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const isMaster = role === "FRANQUEADORA";
  const franchiseId = (session.user as any).franchiseId as string | undefined;

  if (!isMaster && !franchiseId) {
    return NextResponse.json({ error: "Franchise não identificada" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const publicId: string | undefined = body?.publicId;
    if (!publicId) {
      return NextResponse.json({ error: "publicId do signatário é obrigatório." }, { status: 400 });
    }

    // Confirma que o documento pertence à unidade do usuário (mesma checagem das outras rotas).
    const document = await prisma.internshipDocument.findFirst({
      where: {
        id: params.docId,
        contract: {
          id: params.id,
          ...(franchiseId && !isMaster ? { franchiseId } : {}),
        },
      },
      select: { id: true, authDocId: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado ou sem permissão." }, { status: 404 });
    }
    if (!document.authDocId) {
      return NextResponse.json({ error: "Documento ainda não foi enviado para o Autentique." }, { status: 400 });
    }

    const shortLink = await criarLinkAssinatura(publicId);
    return NextResponse.json({ ok: true, shortLink });
  } catch (err: any) {
    console.error("[Autentique/link] Error:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao gerar link de assinatura." },
      { status: 500 }
    );
  }
}
