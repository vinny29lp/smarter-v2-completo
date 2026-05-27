import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enviarParaAutentique, buscarStatusAutentique, AutentiqueSignatario, AUTENTIQUE_INTERNAL_EMAILS } from "@/lib/autentique";
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

    // Filtrar e-mails internos do Autentique antes de salvar (ex: dono da conta)
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
      signers: signatariosReais,
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

    // Sempre salvar o signedUrl quando disponível (independente de mudança de status)
    if (status.signedUrl) {
      updateData.signedUrl = status.signedUrl;
    }

    let contratoAtivado = false;
    let contratoInativado = false;

    if (status.allSigned && document.status !== "ASSINADO") {
      updateData.status = "ASSINADO";

      const docTipo = document.tipo;

      if (docTipo === "tce" || docTipo === "pe") {
        // TCE: todos assinaram → contrato ATIVO
        await prisma.contract.update({
          where: { id: params.id },
          data: { status: "ATIVO" },
        });
        contratoAtivado = true;

        // ── Lançamento automático de Taxa de Administração ──────────────────
        try {
          const contrato = await prisma.contract.findUnique({
            where: { id: params.id },
            select: {
              valorEmpresa: true, companyId: true, franchiseId: true,
              vencimento: true, student: { select: { name: true } },
            },
          });
          if (contrato?.valorEmpresa && contrato.valorEmpresa > 0) {
            const jaExiste = await prisma.financial.findFirst({
              where: { contractId: params.id, categoria: "Taxa Admin" },
            });
            if (!jaExiste) {
              const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
              await prisma.financial.create({
                data: {
                  descricao: `Taxa Admin — ${contrato.student?.name} — ${mesAtual}`,
                  tipo: "entrada",
                  valor: contrato.valorEmpresa,
                  categoria: "Taxa Admin",
                  status: "PENDENTE",
                  recorrente: true,
                  diaVencimento: contrato.vencimento || 5,
                  contractId: params.id,
                  companyId: contrato.companyId,
                  franchiseId: contrato.franchiseId,
                } as any,
              });
            }
          }
        } catch (finErr) {
          console.error("[Financeiro] Erro ao criar lançamento taxa admin:", finErr);
          // Não bloqueia o fluxo principal
        }

      } else if (docTipo === "tr") {
        // TR: todos assinaram → garantir contrato INATIVO
        await prisma.contract.update({
          where: { id: params.id },
          data: { status: "INATIVO" as any },
        });
        contratoInativado = true;

        // ── Regra de rescisão: dia 10 ────────────────────────────────────────
        // Se rescisão APÓS dia 10: cobrança do próximo mês ainda será feita (mantém pendentes)
        // Se rescisão ATÉ dia 10: cancela a cobrança pendente do mês atual para este contrato
        try {
          const diaHoje = new Date().getDate();
          if (diaHoje <= 10) {
            // Cancelar lançamento pendente do mês atual para este contrato
            const iniciaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            await prisma.financial.updateMany({
              where: {
                contractId: params.id,
                categoria: "Taxa Admin",
                status: "PENDENTE",
                createdAt: { gte: iniciaMes },
              },
              data: { cancelado: true, status: "CANCELADO" as any },
            });
          }
          // Se após dia 10: não faz nada — última cobrança já está pendente ou será mantida
        } catch (finErr) {
          console.error("[Financeiro] Erro ao aplicar regra rescisão:", finErr);
        }
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
