import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enviarParaAutentique, buscarStatusAutentique, AutentiqueSignatario } from "@/lib/autentique";
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

  if (!isMaster && !franchiseId) {
    return NextResponse.json({ error: "Franchise não identificada" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { emails, labels }: { emails: string[]; labels?: string[] } = body;

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: "Informe ao menos um e-mail de signatário." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emails) {
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: `E-mail inválido: ${email}` }, { status: 400 });
      }
    }

    const document = await prisma.internshipDocument.findFirst({
      where: {
        id: params.docId,
        contract: {
          id: params.id,
          ...(franchiseId && !isMaster ? { franchiseId } : {}),
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

    // Montar mapa email → label para salvar no metaData
    const signerLabels: Record<string, string> = {};
    if (labels && labels.length > 0) {
      emails.forEach((email, i) => {
        if (labels[i]) signerLabels[email.trim()] = labels[i];
      });
    }

    const existingMeta = (document.metaData as any) || {};

    await prisma.internshipDocument.update({
      where: { id: params.docId },
      data: {
        status: "ENVIADO_ASSINATURA",
        authDocId: resultado.id,
        signers: resultado.signatures as any,
        metaData: {
          ...existingMeta,
          signerLabels,
        },
      },
    });

    // TR: contrato fica INATIVO a partir do envio para assinatura
    // (data ultimoDia já salva no metaData durante a geração)
    if (document.tipo === "tr") {
      await prisma.contract.update({
        where: { id: params.id },
        data: { status: "INATIVO" as any },
      });
    }

    // Notificar signatários por email
    const nomeParte = document.contract?.student?.name || "Signatário";
    for (const signer of resultado.signatures || []) {
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
      signers: resultado.signatures,
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

/** GET — consulta status de assinaturas no Autentique e sincroniza o banco */
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
      include: { contract: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    }

    if (!document.authDocId) {
      return NextResponse.json({ error: "Documento ainda não enviado para o Autentique." }, { status: 400 });
    }

    // Consultar Autentique
    const status = await buscarStatusAutentique(document.authDocId);

    // Mesclar labels salvas no metaData com os signers retornados pelo Autentique
    const metaData = (document.metaData as any) || {};
    const signerLabels: Record<string, string> = metaData.signerLabels || {};

    const signersWithLabels = status.signers.map(s => ({
      ...s,
      label: signerLabels[s.email] || undefined,
    }));

    // Sincronizar banco de dados
    const updateData: any = {
      signers: signersWithLabels as any,
    };

    let contratoAtivado = false;
    let contratoInativado = false;

    if (status.allSigned && document.status !== "ASSINADO") {
      updateData.status = "ASSINADO";
      if (status.signedUrl) updateData.signedUrl = status.signedUrl;

      const docTipo = document.tipo;

      if (docTipo === "tce" || docTipo === "pe") {
        // TCE: todos assinaram → contrato ATIVO
        await prisma.contract.update({
          where: { id: params.id },
          data: { status: "ATIVO" },
        });
        contratoAtivado = true;
      } else if (docTipo === "tr") {
        // TR: todos assinaram → garantir contrato INATIVO (já deveria estar, mas confirmar)
        await prisma.contract.update({
          where: { id: params.id },
          data: { status: "INATIVO" as any },
        });
        contratoInativado = true;
      }
      // Outros documentos: não alteram o status do contrato
    }

    const updated = await prisma.internshipDocument.update({
      where: { id: params.docId },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      allSigned: status.allSigned,
      signedUrl: status.signedUrl,
      signers: signersWithLabels,
      document: updated,
      contratoAtivado,
      contratoInativado,
    });

  } catch (err: any) {
    console.error("[Autentique/GET]", err);
    return NextResponse.json(
      { error: err.message || "Erro ao consultar status no Autentique." },
      { status: 500 }
    );
  }
}
