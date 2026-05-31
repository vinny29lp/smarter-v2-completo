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
  const { titulo, area, atividades, empresa, responsabilidades, extras } = body;

  if (!titulo || !area) {
    return NextResponse.json({ error: "Campos obrigatórios: título, área." }, { status: 400 });
  }

  try {
    const result = await callAI({
      franchiseId,
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      tipoUso: "disc_perfil",
      systemPrompt: AI_PROMPTS.discPerfil.system,
      userPrompt: AI_PROMPTS.discPerfil.user({
        titulo, area, atividades, empresa, responsabilidades, extras,
      }),
      maxTokens: 1000,
      temperature: 0.6,
    });

    return NextResponse.json({
      analise: result.content,
      tokens: result.tokensUsed,
      custo: result.custoEstimado,
    });
  } catch (err: any) {
    console.error("[AI/disc-perfil]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
