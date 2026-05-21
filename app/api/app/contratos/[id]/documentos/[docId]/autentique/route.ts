import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enviarParaAutentique, AutentiqueSignatario } from "@/lib/autentique";

export async function POST(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const franchiseId = session.user.franchiseId;
  if (!franchiseId) return NextResponse.json({ error: "Franchise não identificada" }, { status: 403 });

  try {
    const body = await req.json();
    const { emails }: { emails: string[] } = body;

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: "Informe ao menos um e-mail de signatário." }, { status: 400 });
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emails) {
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: `E-mail inválido: ${email}` }, { status: 400 });
      }
    }

    // Fetch the document and verify franchise ownership
    const document = await prisma.internshipDocument.findFirst({
      where: {
        id: params.docId,
        contract: {
          id: params.id,
          franchiseId,
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    }

    if (!document.htmlContent) {
      return NextResponse.json({
        error: "Documento ainda não foi gerado. Gere o documento antes de enviar para assinatura.",
      }, { status: 400 });
    }

    // Build signers list
    const signatarios: AutentiqueSignatario[] = emails.map(e => ({ email: e.trim() }));

    // Call Autentique
    const resultado = await enviarParaAutentique(
      document.titulo || "Documento",
      document.htmlContent,
      signatarios
    );

    // Update document status and store Autentique document ID in authDocId
    await prisma.internshipDocument.update({
      where: { id: params.docId },
      data: {
        status: "ENVIADO_ASSINATURA",
        authDocId: resultado.id,
      },
    });

    return NextResponse.json({
      ok: true,
      autentiqueId: resultado.id,
      signers: resultado.signers,
      message: `Documento enviado para ${emails.length} signatário(s) via Autentique.`,
    });

  } catch (err: any) {
    console.error("[Autentique] Error:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao enviar para Autentique." },
      { status: 500 }
    );
  }
}
