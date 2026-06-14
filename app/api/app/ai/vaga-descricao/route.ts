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
  const { titulo, empresa, area, curso, nivel, cursoRequerido, bolsa, horario, modalidade, requisitos, descricao, beneficios, extras } = body;

  if (!titulo || !empresa || !bolsa) {
    return NextResponse.json({ error: "Campos obrigatórios: título, empresa, bolsa." }, { status: 400 });
  }

  // Montar descrição do curso/nível para o prompt
  let cursoParaPrompt = "Diversas áreas";
  if (nivel === "Ensino Médio") {
    cursoParaPrompt = "Ensino Médio";
  } else if (cursoRequerido && cursoRequerido !== "Outro") {
    cursoParaPrompt = `${cursoRequerido}${nivel ? ` (${nivel})` : ""}`;
  } else if (nivel) {
    cursoParaPrompt = nivel;
  } else if (curso) {
    cursoParaPrompt = curso;
  }

  try {
    const result = await callAI({
      franchiseId,
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      tipoUso: "vaga_descricao",
      systemPrompt: AI_PROMPTS.vagaDescricao.system,
      userPrompt: AI_PROMPTS.vagaDescricao.user({
        titulo, empresa, area: area || "—", curso: cursoParaPrompt,
        nivel: nivel || "", cursoRequerido: cursoRequerido || "",
        bolsa, horario: horario || "A combinar", modalidade: modalidade || "Presencial",
        requisitos, descricao, beneficios, extras,
      }),
      maxTokens: 1500,
      temperature: 0.7,
    });

    return NextResponse.json({
      descricao: result.content,
      tokens: result.tokensUsed,
      custo: result.custoEstimado,
    });
  } catch (err: any) {
    console.error("[AI/vaga-descricao]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
