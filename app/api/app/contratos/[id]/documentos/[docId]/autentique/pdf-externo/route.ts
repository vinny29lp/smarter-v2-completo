import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enviarParaAutentique, AutentiqueSignatario, AUTENTIQUE_INTERNAL_EMAILS } from "@/lib/autentique";
import { enviarNotificacaoAssinatura } from "@/lib/email";

/**
 * Envia um TCE com modelo PRÓPRIO DA FACULDADE (PDF externo) para assinatura
 * via Autentique — alternativa ao fluxo normal (que sempre gera o HTML do
 * sistema) para quando a instituição de ensino exige seu próprio modelo.
 *
 * Reaproveita a MESMA linha de InternshipDocument (tipo "tce") e a MESMA
 * lógica de ativação do estágio já existente em
 * .../autentique/route.ts (GET) — que só olha `document.tipo` e
 * `document.authDocId`/status, nunca `htmlContent`. Por isso esta rota não
 * precisa (e não deve) duplicar ou alterar o gatilho de ativação: ao marcar
 * este documento como enviado (authDocId preenchido), a verificação de
 * status existente já ativa o contrato quando todos assinarem, exatamente
 * como no fluxo normal.
 */

// Mesmo limite de app/api/app/contratos/[id]/migrar/route.ts — corpo da
// requisição passa pela função serverless da Vercel (~4,5MB, não configurável).
// 4MB de base64 ≈ 3MB de arquivo original.
const MAX_BASE64_LENGTH = 4 * 1024 * 1024;

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
    const { pdfBase64, nomeArquivo, emails, labels }: {
      pdfBase64: string; nomeArquivo?: string; emails: string[]; labels?: string[];
    } = body;

    if (!pdfBase64) {
      return NextResponse.json({ error: "Anexe o PDF do modelo da faculdade." }, { status: 400 });
    }
    if (pdfBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo permitido: 3MB — comprima o PDF ou escaneie em resolução menor." },
        { status: 413 }
      );
    }
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

    // Escopo restrito ao TCE — é o único documento cujo modelo próprio da
    // faculdade faz sentido substituir; "pe" e os demais continuam só pelo
    // gerador interno.
    if (document.tipo !== "tce") {
      return NextResponse.json({ error: "TCE Externa só está disponível para o documento de TCE." }, { status: 400 });
    }

    if (document.authDocId) {
      return NextResponse.json({
        error: "Este TCE já foi enviado para assinatura. Não é possível enviar um TCE externo por cima de um envio existente.",
      }, { status: 409 });
    }

    // Decodifica o base64 (aceita tanto "data:application/pdf;base64,XXXX" quanto o base64 puro)
    const base64Puro = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Puro, "base64");
    } catch {
      return NextResponse.json({ error: "Arquivo inválido — não foi possível ler o PDF." }, { status: 400 });
    }
    // Sanity check: assinatura de arquivo PDF (%PDF no início) — defesa contra
    // upload de um arquivo corrompido ou de outro formato por engano.
    if (buffer.length < 5 || buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json({ error: "O arquivo enviado não parece ser um PDF válido." }, { status: 400 });
    }

    const signatarios: AutentiqueSignatario[] = emails.map(e => ({ email: e.trim() }));

    const resultado = await enviarParaAutentique(
      document.titulo || "TCE Externa",
      "",
      signatarios,
      { buffer, nomeOriginal: nomeArquivo || "tce-externa.pdf" }
    );

    const signerLabels: Record<string, string> = {};
    if (labels && labels.length > 0) {
      emails.forEach((email, i) => {
        if (labels[i]) signerLabels[email.trim()] = labels[i];
      });
    }

    const existingMeta = (document.metaData as any) || {};

    const signatariosReais = (resultado.signatures || []).filter(
      (s: any) => !AUTENTIQUE_INTERNAL_EMAILS.includes((s.email || "").toLowerCase())
    );

    await prisma.internshipDocument.update({
      where: { id: params.docId },
      data: {
        status: "ENVIADO_ASSINATURA",
        authDocId: resultado.id,
        signers: signatariosReais as any,
        metaData: {
          ...existingMeta,
          signerLabels,
          origemExterna: true,
          nomeArquivoOriginal: nomeArquivo || null,
        },
      },
    });

    const nomeParte = document.contract?.student?.name || "Signatário";
    for (const signer of resultado.signatures || []) {
      if (signer.email && signer.link?.short_link) {
        enviarNotificacaoAssinatura({
          email: signer.email,
          nome: signer.name || nomeParte,
          tipoDoc: `${document.titulo || "TCE"} (modelo da instituição)`,
          linkAssinatura: signer.link.short_link,
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      ok: true,
      autentiqueId: resultado.id,
      signers: signatariosReais,
      message: `TCE externo enviado para ${emails.length} signatário(s) via Autentique.`,
    });

  } catch (err: any) {
    console.error("[Autentique/pdf-externo] Error:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao enviar TCE externo para Autentique." },
      { status: 500 }
    );
  }
}
