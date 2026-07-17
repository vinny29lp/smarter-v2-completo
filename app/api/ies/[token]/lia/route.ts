// GET/POST /api/ies/[token]/lia — chat com a Lia dentro do portal da IES.
// Rota PÚBLICA por token — a IES não tem login/sessão NextAuth no sistema (mesmo
// padrão de segurança das demais rotas de /api/ies/[token]/*: o token é o segredo
// de acesso). Só responde se o convênio já estiver FIRMADO (IES logada no portal).

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { callAIChat } from "@/lib/aiService";
import { buildLiaSystemPrompt } from "@/lib/lia/systemPrompt";

const HISTORICO_MAX = 20;
const MENSAGEM_MAX_CHARS = 4000;

async function getInstituicaoAutorizada(token: string) {
  const institution = await prisma.institution.findUnique({
    where: { token },
    select: { id: true, name: true, convenioStatus: true, franchiseId: true },
  });
  if (!institution || institution.convenioStatus !== "FIRMADO") return null;
  return institution;
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const institution = await getInstituicaoAutorizada(params.token);
  if (!institution) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const mensagens = await prisma.liaMessage.findMany({
    where: { actorId: institution.id },
    orderBy: { createdAt: "asc" },
    take: HISTORICO_MAX,
    select: { role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ mensagens });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const institution = await getInstituicaoAutorizada(params.token);
  if (!institution) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const mensagem = typeof body.mensagem === "string" ? body.mensagem.trim() : "";
  if (!mensagem) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  if (mensagem.length > MENSAGEM_MAX_CHARS) {
    return NextResponse.json({ error: "Mensagem muito longa." }, { status: 400 });
  }

  try {
    const historicoAnterior = await prisma.liaMessage.findMany({
      where: { actorId: institution.id },
      orderBy: { createdAt: "desc" },
      take: HISTORICO_MAX,
      select: { role: true, content: true },
    });
    historicoAnterior.reverse();

    await prisma.liaMessage.create({
      data: {
        franchiseId: institution.franchiseId,
        actorType: "IES",
        actorId: institution.id,
        role: "user",
        content: mensagem,
      },
    });

    // Sentinel "FRANQUEADORA" — mesmo usado para o papel FRANQUEADORA em aiService.ts —
    // faz o registrarLog() pular a gravação quando a IES não tem franchiseId real,
    // evitando erro de FK contra a tabela franchises.
    const franchiseIdParaIA = institution.franchiseId || "FRANQUEADORA";

    const result = await callAIChat({
      franchiseId: franchiseIdParaIA,
      tipoUso: "lia_chat",
      systemPrompt: buildLiaSystemPrompt("IES"),
      messages: [
        ...historicoAnterior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: mensagem },
      ],
      maxTokens: 800,
      temperature: 0.7,
    });

    await prisma.liaMessage.create({
      data: {
        franchiseId: institution.franchiseId,
        actorType: "IES",
        actorId: institution.id,
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
    console.error("[AI/lia/ies]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
