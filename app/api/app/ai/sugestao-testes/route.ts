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
  const { titulo, area, curso, atividades, discDesejado, extras } = body;

  if (!titulo || !area || !curso) {
    return NextResponse.json({ error: "Campos obrigatórios: título, área, curso." }, { status: 400 });
  }

  try {
    const result = await callAI({
      franchiseId,
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      tipoUso: "sugestao_testes",
      systemPrompt: AI_PROMPTS.sugestaoTestes.system,
      userPrompt: AI_PROMPTS.sugestaoTestes.user({
        titulo, area, curso, atividades, discDesejado, extras,
      }),
      maxTokens: 1000,
      temperature: 0.6,
    });

    return NextResponse.json({
      testes: result.content,
      tokens: result.tokensUsed,
      custo: result.custoEstimado,
    });
  } catch (err: any) {
    console.error("[AI/sugestao-testes]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
