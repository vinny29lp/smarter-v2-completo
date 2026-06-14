import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callAI, AI_PROMPTS } from "@/lib/aiService";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const franchiseId = session.user.franchiseId;
  if (!franchiseId) return NextResponse.json({ error: "Franquia não identificada" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { titulo, area, nivel, cursoRequerido, descricao } = body;

  if (!titulo || !area) {
    return NextResponse.json({ error: "Campos obrigatórios: título e área." }, { status: 400 });
  }

  try {
    const result = await callAI({
      franchiseId,
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      tipoUso: "sugestao_requisitos",
      systemPrompt: AI_PROMPTS.sugestaoRequisitos.system,
      userPrompt: AI_PROMPTS.sugestaoRequisitos.user({ titulo, area, nivel, cursoRequerido, descricao }),
      maxTokens: 600,
      temperature: 0.5,
    });

    return NextResponse.json({
      requisitos: result.content,
      tokens: result.tokensUsed,
      custo: result.custoEstimado,
    });
  } catch (err: any) {
    console.error("[AI/sugestao-requisitos]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
