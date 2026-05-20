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
  const { curso, area, empresa, setor, descricaoVaga, extras } = body;

  if (!curso || !area) {
    return NextResponse.json({ error: "Campos obrigatórios: curso, área." }, { status: 400 });
  }

  try {
    const result = await callAI({
      franchiseId,
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      tipoUso: "tce_atividades",
      systemPrompt: AI_PROMPTS.tceAtividades.system,
      userPrompt: AI_PROMPTS.tceAtividades.user({
        curso, area, empresa: empresa || "Empresa Concedente", setor, descricaoVaga, extras,
      }),
      maxTokens: 800,
      temperature: 0.5,
    });

    return NextResponse.json({
      atividades: result.content,
      tokens: result.tokensUsed,
      custo: result.custoEstimado,
    });
  } catch (err: any) {
    console.error("[AI/tce-atividades]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
