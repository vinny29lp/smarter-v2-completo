import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { buscarStatusAutentique } from "@/lib/autentique";

/**
 * GET /api/app/contratos/[id]/documentos/[docId]/download-assinado
 * Faz proxy do arquivo PDF assinado pelo Autentique.
 *
 * Se signedUrl não estiver em cache no banco, busca no Autentique on-demand
 * (útil para documentos assinados antes do signedUrl ser salvo).
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

    let signedUrl = document.signedUrl;

    // Se não tiver em cache mas tiver authDocId, busca no Autentique agora
    if (!signedUrl && document.authDocId) {
      try {
        const status = await buscarStatusAutentique(document.authDocId);
        if (status.signedUrl) {
          signedUrl = status.signedUrl;
          // Salvar no banco para próximas chamadas
          await prisma.internshipDocument.update({
            where: { id: params.docId },
            data: { signedUrl, status: "ASSINADO" },
          });
        }
      } catch (autentiqueErr: any) {
        console.warn("[download-assinado] Autentique lookup failed:", autentiqueErr?.message);
      }
    }

    if (!signedUrl) {
      return NextResponse.json(
        { error: "Documento assinado ainda não disponível. Aguarde todos os signatários assinarem e clique em 'Verificar Assinaturas'." },
        { status: 404 }
      );
    }

    // Proxy do PDF
    const resp = await fetch(signedUrl, {
      headers: { Accept: "application/pdf, application/octet-stream, */*" },
    });

    if (!resp.ok) {
      // URL expirada — tenta renovar buscando novamente no Autentique
      if (document.authDocId) {
        try {
          const status = await buscarStatusAutentique(document.authDocId);
          if (status.signedUrl && status.signedUrl !== signedUrl) {
            signedUrl = status.signedUrl;
            await prisma.internshipDocument.update({
              where: { id: params.docId },
              data: { signedUrl },
            });
            const resp2 = await fetch(signedUrl, {
              headers: { Accept: "application/pdf, application/octet-stream, */*" },
            });
            if (resp2.ok) {
              const buffer2 = await resp2.arrayBuffer();
              const nome2 = `${(document.titulo || "documento-assinado").replace(/\s+/g, "-")}-assinado.pdf`;
              return new NextResponse(buffer2, {
                status: 200,
                headers: {
                  "Content-Type": "application/pdf",
                  "Content-Disposition": `attachment; filename="${nome2}"`,
                  "Content-Length": buffer2.byteLength.toString(),
                },
              });
            }
          }
        } catch {}
      }
      return NextResponse.json(
        { error: `Erro ao buscar arquivo assinado (HTTP ${resp.status}). O link pode ter expirado — tente verificar o status novamente.` },
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
