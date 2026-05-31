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
  const { candidato, vaga, empresa, discPerfil, anotacoes, parecerAtual, recomendacao } = body;

  if (!candidato || !vaga) {
    return NextResponse.json({ error: "Campos obrigatórios: candidato, vaga." }, { status: 400 });
  }

  try {
    const result = await callAI({
      franchiseId,
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      tipoUso: "parecer",
      systemPrompt: AI_PROMPTS.parecerTecnico.system,
      userPrompt: AI_PROMPTS.parecerTecnico.user({
        candidato, vaga, empresa: empresa || "Empresa", discPerfil,
        anotacoes, parecerAtual, recomendacao,
      }),
      maxTokens: 1200,
      temperature: 0.6,
    });

    return NextResponse.json({
      parecer: result.content,
      tokens: result.tokensUsed,
      custo: result.custoEstimado,
    });
  } catch (err: any) {
    console.error("[AI/parecer]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
