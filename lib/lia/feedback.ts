/**
 * feedback.ts — Protocolo de captura de feedback (bug/elogio/crítica/sugestão) dado
 * pelo usuário durante uma conversa com a Lia.
 *
 * A Lia não tem acesso a "tool calling" — o modelo é instruído (em systemPrompt.ts) a,
 * quando identificar um feedback, anexar ao FINAL da própria resposta um marcador
 * oculto de uma linha só, no formato:
 *
 *   [[LIA_FEEDBACK:{"tipo":"bug","sentimento":"negativo","resumo":"..."}]]
 *
 * As rotas de chat (app/api/app/ai/lia/route.ts e app/api/ies/[token]/lia/route.ts)
 * chamam extrairFeedback() para separar esse marcador do texto — o usuário nunca vê
 * o marcador, e o texto limpo é o que é salvo/exibido como resposta da Lia.
 */

export type LiaFeedbackTipo = "bug" | "elogio" | "critica" | "sugestao";
export type LiaFeedbackSentimento = "positivo" | "neutro" | "negativo";

export interface LiaFeedbackExtraido {
  tipo: LiaFeedbackTipo;
  sentimento: LiaFeedbackSentimento;
  resumo: string;
}

const TIPOS_VALIDOS: LiaFeedbackTipo[] = ["bug", "elogio", "critica", "sugestao"];
const SENTIMENTOS_VALIDOS: LiaFeedbackSentimento[] = ["positivo", "neutro", "negativo"];

// Casa com [[LIA_FEEDBACK:{...}]], em qualquer lugar do texto (a instrução pede que
// seja a última linha, mas o parser não depende disso). [\s\S] no lugar de "." com
// flag /s porque o target TS do projeto (ES2017) não suporta a flag dotAll.
const MARCADOR_REGEX = /\[\[LIA_FEEDBACK:(\{[\s\S]*?\})\]\]/;

/**
 * Remove o marcador de feedback (se existir) do texto e retorna o texto limpo junto
 * com o feedback estruturado, já validado. Nunca lança erro — se o marcador estiver
 * malformado, ele é removido silenciosamente e nenhum feedback é retornado.
 */
export function extrairFeedback(textoOriginal: string): {
  texto: string;
  feedback: LiaFeedbackExtraido | null;
} {
  const match = textoOriginal.match(MARCADOR_REGEX);
  if (!match) return { texto: textoOriginal.trim(), feedback: null };

  const texto = textoOriginal.replace(MARCADOR_REGEX, "").trim();

  try {
    const parsed = JSON.parse(match[1]);
    const tipo = TIPOS_VALIDOS.includes(parsed.tipo) ? (parsed.tipo as LiaFeedbackTipo) : null;
    const sentimento = SENTIMENTOS_VALIDOS.includes(parsed.sentimento)
      ? (parsed.sentimento as LiaFeedbackSentimento)
      : "neutro";
    const resumo = typeof parsed.resumo === "string" ? parsed.resumo.trim().slice(0, 500) : "";

    if (!tipo || !resumo) return { texto, feedback: null };

    return { texto, feedback: { tipo, sentimento, resumo } };
  } catch {
    return { texto, feedback: null };
  }
}
