import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/app/contratos/[id]/documentos/[docId]/download-assinado
 * Faz proxy do arquivo PDF assinado pelo Autentique para o browser do usuário.
 * Necessário porque URLs de CDN externo bloqueiam o atributo HTML "download".
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const franchiseId = (session.user as any).franchiseId as string | undefined;
  const isMaster    = session.user.role === "FRANQUEADORA";

  try {
    const document = await prisma.internshipDocument.findFirst({
      where: {
        id: params.docId,
        contract: {
          id: params.id,
          ...(franchiseId && !isMaster ? { franchiseId } : {}),
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    }

    const signedUrl = document.signedUrl;
    if (!signedUrl) {
      return NextResponse.json(
        { error: "Documento assinado ainda não disponível. Verifique o status primeiro." },
        { status: 404 }
      );
    }

    // Buscar o PDF do Autentique
    const resp = await fetch(signedUrl, { headers: { Accept: "application/pdf" } });
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Erro ao buscar arquivo assinado: HTTP ${resp.status}` },
        { status: 502 }
      );
    }

    const buffer = await resp.arrayBuffer();
    const nomeArquivo = `${(document.titulo || "documento-assinado").replace(/\s+/g, "-")}-assinado.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
        "Content-Length": buffer.byteLength.toString(),
      },
    });

  } catch (err: any) {
    console.error("[download-assinado]", err);
    return NextResponse.json(
      { error: err.message || "Erro ao baixar documento assinado." },
      { status: 500 }
    );
  }
}
