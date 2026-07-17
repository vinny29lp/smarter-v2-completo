import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callAIChat } from "@/lib/aiService";
import { buildLiaSystemPrompt, LiaContexto } from "@/lib/lia/systemPrompt";

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

  try {
    const historicoAnterior = await prisma.liaMessage.findMany({
      where: { actorId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: HISTORICO_MAX,
      select: { role: true, content: true },
    });
    historicoAnterior.reverse();

    await prisma.liaMessage.create({
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
      systemPrompt: buildLiaSystemPrompt(contexto),
      messages: [
        ...historicoAnterior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: mensagem },
      ],
      maxTokens: 800,
      temperature: 0.7,
    });

    await prisma.liaMessage.create({
      data: {
        franchiseId,
        actorType: contexto,
        actorId: session.user.id,
        role: "assistant",
        content: result.content,
      },
    });

    return NextResponse.json({
      resposta: result.content,
      tokens: result.tokensUsed,
      custo: result.custoEstimado,
    });
  } catch (err: any) {
    console.error("[AI/lia]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
