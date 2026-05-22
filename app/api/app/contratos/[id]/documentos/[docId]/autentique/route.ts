import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enviarParaAutentique, AutentiqueSignatario } from "@/lib/autentique";
import { enviarNotificacaoAssinatura } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const isMaster = role === "FRANQUEADORA";
  const franchiseId = (session.user as any).franchiseId as string | undefined;

  // FRANQUEADORA pode acessar qualquer contrato; FRANQUEADO precisa ter franchiseId
  if (!isMaster && !franchiseId) {
    return NextResponse.json({ error: "Franchise não identificada" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { emails }: { emails: string[] } = body;

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: "Informe ao menos um e-mail de signatário." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emails) {
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: `E-mail inválido: ${email}` }, { status: 400 });
      }
    }

    // Buscar documento — FRANQUEADORA vê todos, FRANQUEADO vê só os seus
    const document = await prisma.internshipDocument.findFirst({
      where: {
        id: params.docId,
        contract: {
          id: params.id,
          ...(franchiseId ? { franchiseId } : {}),
        },
      },
      include: { contract: { include: { student: true } } },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado ou sem permissão." }, { status: 404 });
    }

    if (!document.htmlContent) {
      return NextResponse.json({
        error: "Documento ainda não foi gerado. Gere o documento antes de enviar para assinatura.",
      }, { status: 400 });
    }

    const signatarios: AutentiqueSignatario[] = emails.map(e => ({ email: e.trim() }));

    const resultado = await enviarParaAutentique(
      document.titulo || "Documento",
      document.htmlContent,
      signatarios
    );

    await prisma.internshipDocument.update({
      where: { id: params.docId },
      data: {
        status: "ENVIADO_ASSINATURA",
        authDocId: resultado.id,
        signers: resultado.signers as any,
      },
    });

    // Notificar signatários por email
    const nomeParte = document.contract?.student?.name || "Signatário";
    for (const signer of resultado.signers || []) {
      if (signer.email && signer.link?.short_link) {
        enviarNotificacaoAssinatura({
          email: signer.email,
          nome: signer.name || nomeParte,
          tipoDoc: document.titulo || "Documento",
          linkAssinatura: signer.link.short_link,
        }).catch(() => {});
      }
    }

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
