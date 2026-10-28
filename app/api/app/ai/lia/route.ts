import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callAIChat } from "@/lib/aiService";
import { buildLiaSystemPrompt, LiaContexto } from "@/lib/lia/systemPrompt";
import { extrairFeedback } from "@/lib/lia/feedback";
import { extractSupportIntent } from "@/lib/lia/support-intent";
import { getSupportMapping, sendSupportCase } from "@/lib/support/ai-workforce";
import { supportStatusMessage } from "@/lib/support/status-message";
import { parseSupportMedia } from "@/lib/support/media";

// Papéis com acesso à Lia dentro do sistema logado (a versão IES fica em /api/ies/[token]/lia).
const ROLES_PERMITIDOS: Record<string, LiaContexto> = {
  FRANQUEADO: "FRANQUEADO",
  EMPRESA: "EMPRESA",
  ESTUDANTE: "ESTUDANTE",
};

const HISTORICO_MAX = 20;
const MENSAGEM_MAX_CHARS = 4000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const contexto = ROLES_PERMITIDOS[session.user.role || ""];
  if (!contexto) return NextResponse.json({ error: "Papel sem acesso à Lia" }, { status: 403 });

  const mensagens = await prisma.liaMessage.findMany({
    where: { actorId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: HISTORICO_MAX,
    select: { role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ mensagens });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const contexto = ROLES_PERMITIDOS[session.user.role || ""];
  if (!contexto) return NextResponse.json({ error: "Papel sem acesso à Lia" }, { status: 403 });

  const franchiseId = session.user.franchiseId;
  if (!franchiseId) return NextResponse.json({ error: "Franquia não identificada" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const mensagem = typeof body.mensagem === "string" ? body.mensagem.trim() : "";
  if (!mensagem) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  if (mensagem.length > MENSAGEM_MAX_CHARS) {
    return NextResponse.json({ error: "Mensagem muito longa." }, { status: 400 });
  }
  const parsedMedia = parseSupportMedia(body.media, body.mediaConsent);
  if (parsedMedia.error) return NextResponse.json({ error: parsedMedia.error }, { status: 400 });

  try {
    const historicoAnterior = await prisma.liaMessage.findMany({
      where: { actorId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: HISTORICO_MAX,
      select: { role: true, content: true },
    });
    historicoAnterior.reverse();

    const userMessage = await prisma.liaMessage.create({
      data: {
        franchiseId,
        actorType: contexto,
        actorId: session.user.id,
        role: "user",
        content: mensagem,
      },
    });

    const result = await callAIChat({
      franchiseId,
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      tipoUso: "lia_chat",
      systemPrompt: buildLiaSystemPrompt(contexto, true),
      messages: [
        ...historicoAnterior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: mensagem },
      ],
      maxTokens: 800,
      temperature: 0.7,
    });

    const supportParsed = extractSupportIntent(result.content);
    const { texto: respostaLimpa, feedback } = extrairFeedback(supportParsed.text);
    let respostaFinal = respostaLimpa;

    if (supportParsed.intent) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true, email: true, role: true, franchiseId: true, companyId: true,
          franchise: { select: { name: true, telefone: true, whatsapp: true } },
          company: { select: { name: true, telefone: true, franchiseId: true } },
          student: { select: { telefone: true, celular: true, franchiseId: true } },
          employee: { select: { franchiseId: true } },
        },
      });
      const mappedFranchiseId = user?.franchiseId ?? user?.company?.franchiseId ?? user?.student?.franchiseId ?? user?.employee?.franchiseId ?? franchiseId;
      const mapping = getSupportMapping(mappedFranchiseId);
      const caseUuid = crypto.randomUUID();
      const externalReference = `smarter-support:${caseUuid}`;
      const now = new Date();
      const path = typeof body.path === "string" ? body.path.slice(0, 500) : "/dashboard";
      const safeTechnical = body.technicalData && typeof body.technicalData === "object" ? {
        userAgent: typeof body.technicalData.userAgent === "string" ? body.technicalData.userAgent.slice(0, 1000) : undefined,
        viewport: typeof body.technicalData.viewport === "string" ? body.technicalData.viewport.slice(0, 100) : undefined,
        locale: typeof body.technicalData.locale === "string" ? body.technicalData.locale.slice(0, 50) : undefined,
        timezone: typeof body.technicalData.timezone === "string" ? body.technicalData.timezone.slice(0, 100) : undefined,
      } : undefined;
      const description = [
        supportParsed.intent.description,
        `Mensagem completa: ${mensagem}`,
        `Tela/caminho: ${path}`,
        `Data/hora: ${now.toISOString()}`,
        `Perfil: ${contexto}`,
        `Empresa: ${user?.company?.name || "não vinculada"}`,
        `Unidade: ${user?.franchise?.name || "não informada"}`,
        `Contexto técnico seguro: ${safeTechnical ? JSON.stringify(safeTechnical) : "não informado"}`,
        parsedMedia.media.length ? `${parsedMedia.media.length} mídia(s) enviada(s) com consentimento explícito.` : "Sem mídia anexada.",
        "Nenhum reparo foi autorizado automaticamente.",
      ].join("\n");
      const reporterPhone = user?.student?.celular || user?.student?.telefone || user?.company?.telefone || user?.franchise?.whatsapp || user?.franchise?.telefone || "";
      const supportCase = await prisma.supportCase.create({
        data: {
          id: caseUuid, externalReference, userId: session.user.id, franchiseId: mappedFranchiseId, companyId: user?.companyId,
          reporterName: user?.name || session.user.name || "Cliente Smarter", reporterEmail: user?.email || session.user.email || null,
          reporterPhone, title: supportParsed.intent.title, description, path, attemptedAction: mensagem,
          errorMessage: supportParsed.intent.category === "bug" ? mensagem : "Não informado", technicalData: safeTechnical,
          category: supportParsed.intent.category, actorType: contexto, actorId: session.user.id, sourceMessageId: userMessage.id,
          mediaConsentAt: parsedMedia.media.length ? now : null, mediaCount: parsedMedia.media.length,
        },
      });

      if (!mapping) {
        await prisma.supportCase.update({ where: { id: supportCase.id }, data: { status: "ERROR", lastError: "not_mapped" } });
        respostaFinal = "Registrei seu relato, mas a unidade ainda não está mapeada no suporte técnico. A operação foi alertada para corrigir o cadastro.";
      } else {
        const sent = await sendSupportCase({
          orgId: mapping.orgId, unitId: mapping.unitId, externalReference, reporterName: supportCase.reporterName,
          reporterEmail: supportCase.reporterEmail, reporterPhone, category: supportParsed.intent.category,
          title: supportParsed.intent.title, description,
          ...(parsedMedia.media.length ? { mediaConsent: true as const, media: parsedMedia.media } : {}),
        }, { maxAttempts: 1 });
        if (sent.ok) {
          await prisma.supportCase.update({ where: { id: supportCase.id }, data: {
            status: "SENT", protocol: sent.protocol, remoteStatus: sent.supportCase?.status || "open",
            resolution: sent.supportCase?.resolution, repairProposal: sent.supportCase?.repairProposal,
            remoteUpdatedAt: sent.supportCase?.updatedAt ? new Date(sent.supportCase.updatedAt) : now,
            remoteResolvedAt: sent.supportCase?.resolvedAt ? new Date(sent.supportCase.resolvedAt) : null,
            attemptCount: { increment: 1 }, lastError: null,
          } });
          respostaFinal = sent.supportCase ? supportStatusMessage(sent.supportCase) : `O caso foi encaminhado ao TI. Protocolo: ${sent.protocol}.`;
        } else {
          const retryAt = sent.retryable ? new Date(Date.now() + 5 * 60_000) : null;
          await prisma.supportCase.update({ where: { id: supportCase.id }, data: {
            status: sent.retryable ? "PENDING" : "ERROR", lastError: sent.code, nextRetryAt: retryAt, attemptCount: { increment: 1 },
          } });
          respostaFinal = sent.retryable
            ? "Seu relato foi salvo e será reenviado ao TI com segurança, usando o mesmo identificador para não duplicar o chamado."
            : `Não foi possível encaminhar o caso: ${sent.message}`;
        }
      }
    }

    await prisma.liaMessage.create({
      data: {
        franchiseId,
        actorType: contexto,
        actorId: session.user.id,
        role: "assistant",
        content: respostaFinal,
      },
    });

    if (feedback) {
      await prisma.liaFeedback.create({
        data: {
          franchiseId,
          tipo: feedback.tipo,
          sentimento: feedback.sentimento,
          resumo: feedback.resumo,
          actorType: contexto,
          actorId: session.user.id,
        },
      }).catch((e) => console.error("[AI/lia] Erro ao registrar feedback:", e));
    }

    return NextResponse.json({
      resposta: respostaFinal,
      bugDetectado: feedback?.tipo === "bug",
      tokens: result.tokensUsed,
      custo: result.custoEstimado,
    });
  } catch (err: any) {
    console.error("[AI/lia]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
