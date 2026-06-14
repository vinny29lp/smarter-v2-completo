/**
 * aiService.ts — Serviço Central de IA Smarter Estágios
 *
 * Toda comunicação com OpenAI passa por aqui.
 * NUNCA chamar OpenAI diretamente do frontend.
 */

import { prisma } from "@/lib/prisma";

// ── TIPOS ───────────────────────────────────────────────────────────────────

export type AITipoUso =
  | "vaga_descricao"
  | "tce_atividades"
  | "parecer"
  | "sugestao_testes"
  | "sugestao_requisitos"
  | "disc_perfil";

export interface AICallOptions {
  franchiseId: string;
  userId?: string;
  userEmail?: string;
  tipoUso: AITipoUso;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AICallResult {
  content: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  custoEstimado: number;
}

// ── CONFIGURAÇÕES ─────────────────────────────────────────────────────────

const MODELO = "gpt-4.1-mini";

// Custo por 1000 tokens (USD) — gpt-4.1-mini
const CUSTO_INPUT_PER_1K  = 0.0004;  // $0.40 / 1M tokens input
const CUSTO_OUTPUT_PER_1K = 0.0016;  // $1.60 / 1M tokens output

// Limites diários
const LIMITE_DIARIO_USUARIO   = 50;   // chamadas por usuário por dia
const LIMITE_DIARIO_FRANQUIA  = 200;  // chamadas por franquia por dia

// ── VERIFICAÇÃO DE LIMITE ─────────────────────────────────────────────────

async function verificarLimite(franchiseId: string, userId?: string): Promise<{ ok: boolean; motivo?: string }> {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Verificar limite da franquia
    const usoFranquia = await prisma.aIUsageLog.count({
      where: {
        franchiseId,
        sucesso: true,
        createdAt: { gte: hoje, lt: amanha },
      },
    });

    if (usoFranquia >= LIMITE_DIARIO_FRANQUIA) {
      return {
        ok: false,
        motivo: `Limite diário da franquia atingido (${LIMITE_DIARIO_FRANQUIA} usos/dia). Tente amanhã.`,
      };
    }

    // Verificar limite do usuário
    if (userId) {
      const usoUsuario = await prisma.aIUsageLog.count({
        where: {
          userId,
          sucesso: true,
          createdAt: { gte: hoje, lt: amanha },
        },
      });

      if (usoUsuario >= LIMITE_DIARIO_USUARIO) {
        return {
          ok: false,
          motivo: `Limite diário do usuário atingido (${LIMITE_DIARIO_USUARIO} usos/dia). Tente amanhã.`,
        };
      }
    }

    return { ok: true };
  } catch (e) {
    // Se a tabela de log ainda não existe no banco, não bloqueia o uso da IA
    console.error("[AIService] Erro ao verificar limite (tabela de log indisponível):", e);
    return { ok: true };
  }
}

// ── REGISTRAR LOG ─────────────────────────────────────────────────────────

async function registrarLog(opts: {
  franchiseId: string;
  userId?: string;
  userEmail?: string;
  tipoUso: AITipoUso;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  custoEstimado: number;
  modelo: string;
  sucesso: boolean;
  erro?: string;
}): Promise<void> {
  try {
    await prisma.aIUsageLog.create({
      data: {
        franchiseId: opts.franchiseId,
        userId: opts.userId,
        userEmail: opts.userEmail,
        tipoUso: opts.tipoUso,
        promptTokens: opts.promptTokens,
        completionTokens: opts.completionTokens,
        totalTokens: opts.totalTokens,
        custoEstimado: opts.custoEstimado,
        modelo: opts.modelo,
        sucesso: opts.sucesso,
        erro: opts.erro,
      },
    });
  } catch (e) {
    console.error("[AIService] Erro ao registrar log:", e);
  }
}

// ── CHAMADA PRINCIPAL ─────────────────────────────────────────────────────

export async function callAI(opts: AICallOptions): Promise<AICallResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada no ambiente.");
  }

  // Verificar limites
  const limite = await verificarLimite(opts.franchiseId, opts.userId);
  if (!limite.ok) {
    await registrarLog({
      franchiseId: opts.franchiseId,
      userId: opts.userId,
      userEmail: opts.userEmail,
      tipoUso: opts.tipoUso,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      custoEstimado: 0,
      modelo: MODELO,
      sucesso: false,
      erro: limite.motivo,
    });
    throw new Error(limite.motivo);
  }

  let promptTokens = 0;
  let completionTokens = 0;
  let content = "";

  // RES-001: Timeout de 30s para chamadas à OpenAI
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: opts.maxTokens || 1200,
        temperature: opts.temperature ?? 0.7,
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user",   content: opts.userPrompt },
        ],
      }),
    });

    clearTimeout(timeoutId);

    // RES-002: Tratamento de rate limit (429) com mensagem amigável
    if (response.status === 429) {
      throw new Error("Limite de requisições de IA atingido. Aguarde alguns segundos e tente novamente.");
    }

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`A IA encontrou um problema (erro ${response.status}). Tente novamente em instantes.`);
    }

    const data = await response.json();
    content = data.choices?.[0]?.message?.content || "";
    promptTokens     = data.usage?.prompt_tokens     || 0;
    completionTokens = data.usage?.completion_tokens || 0;

  } catch (err: any) {
    clearTimeout(timeoutId);
    // RES-005: Mensagem amigável para timeout e erros de rede
    if (err.name === "AbortError") {
      err.message = "A IA demorou mais de 30 segundos para responder. Tente novamente.";
    } else if (err.message?.includes("fetch failed") || err.message?.includes("ECONNREFUSED")) {
      err.message = "Não foi possível conectar à IA. Verifique sua conexão e tente novamente.";
    }
    await registrarLog({
      franchiseId: opts.franchiseId,
      userId: opts.userId,
      userEmail: opts.userEmail,
      tipoUso: opts.tipoUso,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      custoEstimado: 0,
      modelo: MODELO,
      sucesso: false,
      erro: err.message,
    });
    throw err;
  }

  const totalTokens    = promptTokens + completionTokens;
  const custoEstimado  = (promptTokens / 1000) * CUSTO_INPUT_PER_1K
                       + (completionTokens / 1000) * CUSTO_OUTPUT_PER_1K;

  // Registrar uso com sucesso
  await registrarLog({
    franchiseId: opts.franchiseId,
    userId: opts.userId,
    userEmail: opts.userEmail,
    tipoUso: opts.tipoUso,
    promptTokens,
    completionTokens,
    totalTokens,
    custoEstimado,
    modelo: MODELO,
    sucesso: true,
  });

  return {
    content,
    tokensUsed: { prompt: promptTokens, completion: completionTokens, total: totalTokens },
    custoEstimado,
  };
}

// ── PROMPTS ESPECIALIZADOS ────────────────────────────────────────────────

export const AI_PROMPTS = {

  // 1. Descrição de Vaga
  vagaDescricao: {
    system: `Você é um especialista em recrutamento e seleção de estagiários no Brasil, com profundo conhecimento da Lei do Estágio 11.788/2008.
Sua tarefa é criar descrições de vagas profissionais, atraentes e completas para o portal Smarter Estágios.
Escreva em português brasileiro formal mas acessível.
Seja específico, objetivo e profissional.
Não invente informações além do que foi fornecido.
Formate o texto de forma clara com seções bem definidas.
REGRA OBRIGATÓRIA — Lei 11.788/2008: O estágio deve obrigatoriamente estar relacionado ao projeto pedagógico do curso do estudante (art. 1º e art. 3º). Sempre mencione o curso/nível de ensino exato informado nos requisitos. Nunca escreva "cursando qualquer área" ou "diversas áreas" — use o curso específico fornecido.`,

    user: (data: {
      titulo: string; empresa: string; area: string; curso: string;
      nivel?: string; cursoRequerido?: string;
      bolsa: string; horario: string; modalidade: string;
      requisitos?: string; descricao?: string; beneficios?: string; extras?: string;
    }) => `Crie uma descrição profissional completa para a seguinte vaga de estágio:

TÍTULO: ${data.titulo}
EMPRESA: ${data.empresa}
ÁREA: ${data.area}
NÍVEL DE ENSINO: ${data.nivel || (data.curso !== "Diversas áreas" ? "Ensino Superior" : "A definir")}
CURSO REQUERIDO: ${data.cursoRequerido && data.cursoRequerido !== "Outro" ? data.cursoRequerido : data.curso}
BOLSA: R$ ${data.bolsa}/mês
HORÁRIO: ${data.horario}
MODALIDADE: ${data.modalidade}
${data.requisitos ? `REQUISITOS INFORMADOS: ${data.requisitos}` : ""}
${data.descricao ? `DESCRIÇÃO INICIAL: ${data.descricao}` : ""}
${data.beneficios ? `BENEFÍCIOS: ${data.beneficios}` : ""}
${data.extras ? `INFORMAÇÕES ADICIONAIS: ${data.extras}` : ""}

IMPORTANTE — Lei 11.788/2008: Na seção Requisitos, mencione EXPLICITAMENTE que o candidato deve estar regularmente matriculado no curso "${data.cursoRequerido && data.cursoRequerido !== "Outro" ? data.cursoRequerido : data.curso}" (${data.nivel || "Ensino Superior"}). Não use "qualquer área" ou "diversas áreas".

Gere uma descrição com as seções:
## Sobre a Vaga
## Atividades
## Requisitos
## Perfil Ideal
## Benefícios
## Sobre a Empresa (baseado nas informações disponíveis)

Seja profissional, específico e atraente para o público universitário.`,
  },

  // 2. Atividades TCE (Lei 11.788/08)
  tceAtividades: {
    system: `Você é um especialista em Direito do Trabalho e estágios no Brasil, com profundo conhecimento da Lei 11.788/2008.
Sua tarefa é criar descrições de atividades de estágio que sejam:
- Compatíveis com o curso do estagiário
- Juridicamente adequadas à Lei 11.788/08
- Específicas e mensuráveis
- Que evitem desvio de função
- Adequadas para TCE (Termo de Compromisso de Estágio)
Escreva em português formal jurídico-profissional.
Liste de 4 a 6 atividades numeradas, cada uma em uma única linha.`,

    user: (data: {
      curso: string; area: string; empresa: string;
      setor?: string; descricaoVaga?: string; extras?: string;
    }) => `Gere atividades de estágio para TCE (Lei 11.788/2008) com os seguintes dados:

CURSO: ${data.curso}
ÁREA DE ATUAÇÃO: ${data.area}
EMPRESA: ${data.empresa}
${data.setor ? `SETOR: ${data.setor}` : ""}
${data.descricaoVaga ? `DESCRIÇÃO DA VAGA: ${data.descricaoVaga}` : ""}
${data.extras ? `INFORMAÇÕES ADICIONAIS: ${data.extras}` : ""}

Gere de 4 a 6 atividades de estágio que:
1. Sejam compatíveis com o curso de ${data.curso}
2. Estejam em conformidade com a Lei 11.788/2008
3. Evitem desvio de função
4. Sejam específicas e profissionais
5. Adequadas para constar no TCE

Formate cada atividade numerada, como:
1. [Atividade específica e profissional]
2. [Atividade específica e profissional]
...`,
  },

  // 3. Parecer Técnico
  parecerTecnico: {
    system: `Você é um especialista em recrutamento, seleção e análise comportamental.
Sua tarefa é transformar observações brutas de recrutadores em pareceres técnicos profissionais.
IMPORTANTE:
- Não invente informações além do que foi fornecido
- Apenas melhore profissionalmente o conteúdo existente
- Seja objetivo, técnico e imparcial
- Use linguagem profissional de RH
- Seja construtivo, mesmo nos pontos negativos`,

    user: (data: {
      candidato: string; vaga: string; empresa: string;
      discPerfil?: string; anotacoes?: string; parecerAtual?: string;
      recomendacao?: string;
    }) => `Melhore profissionalmente as anotações do processo seletivo abaixo:

CANDIDATO: ${data.candidato}
VAGA: ${data.vaga}
EMPRESA: ${data.empresa}
${data.discPerfil ? `PERFIL DISC: ${data.discPerfil}` : ""}
${data.recomendacao ? `RECOMENDAÇÃO DO RECRUTADOR: ${data.recomendacao.toUpperCase()}` : ""}
${data.anotacoes ? `ANOTAÇÕES DO RECRUTADOR:\n${data.anotacoes}` : ""}
${data.parecerAtual ? `PARECER ATUAL:\n${data.parecerAtual}` : ""}

Gere um parecer técnico profissional com as seções:

## Avaliação Geral
## Análise Comportamental${data.discPerfil ? ` (DISC: ${data.discPerfil})` : ""}
## Pontos Fortes
## Pontos de Atenção
## Aderência à Vaga
## Recomendação Final

Seja objetivo, técnico e profissional. Não invente informações.`,
  },

  // 4a. Sugestão de Requisitos
  sugestaoRequisitos: {
    system: `Você é um especialista em recrutamento e seleção para estágios no Brasil, com conhecimento da Lei do Estágio 11.788/2008.
Sua tarefa é sugerir requisitos adequados e realistas para vagas de estágio.
Foque em requisitos objetivos, alcançáveis por estagiários e relevantes para a função.
REGRA OBRIGATÓRIA — Lei 11.788/2008 (art. 1º e 3º): O primeiro requisito SEMPRE deve mencionar explicitamente o curso e nível de ensino requerido. Nunca escreva "qualquer área" ou "diversas áreas" — use o curso e nível específico informado.`,

    user: (data: {
      titulo: string; area: string; nivel?: string; cursoRequerido?: string; descricao?: string;
    }) => `Sugira os requisitos para a seguinte vaga de estágio:

VAGA: ${data.titulo}
ÁREA: ${data.area}
NÍVEL DE ENSINO: ${data.nivel || "Ensino Superior"}
CURSO REQUERIDO: ${data.cursoRequerido && data.cursoRequerido !== "Outro" ? data.cursoRequerido : "A definir"}
${data.descricao ? `DESCRIÇÃO DA VAGA:\n${data.descricao}` : ""}

Liste os requisitos no seguinte formato:
- [Requisito]
- [Requisito]
...

O PRIMEIRO requisito deve ser: "Estar regularmente matriculado(a) em ${data.nivel || "Ensino Superior"} no curso de ${data.cursoRequerido && data.cursoRequerido !== "Outro" ? data.cursoRequerido : "área correlata"} (conforme Lei 11.788/2008)"
Depois inclua: habilidades técnicas básicas e competências comportamentais relevantes para a função.
Seja realista para o nível de estagiário. Máximo 8 requisitos no total, em português.`,
  },

  // 4b. Sugestão de Testes
  sugestaoTestes: {
    system: `Você é um especialista em psicologia organizacional e processos seletivos para estágios.
Sua tarefa é sugerir testes práticos e comportamentais adequados para seleção de estagiários.
Foque em testes simples, objetivos e aplicáveis em processos seletivos de estágio.
Sugira NO MÁXIMO 2 testes para não sobrecarregar o processo.`,

    user: (data: {
      titulo: string; area: string; curso: string;
      atividades?: string; discDesejado?: string; extras?: string;
    }) => `Sugira testes para o processo seletivo da seguinte vaga de estágio:

VAGA: ${data.titulo}
ÁREA: ${data.area}
CURSO: ${data.curso}
${data.atividades ? `ATIVIDADES DA VAGA:\n${data.atividades}` : ""}
${data.discDesejado ? `PERFIL DISC DESEJADO: ${data.discDesejado}` : ""}
${data.extras ? `INFORMAÇÕES ADICIONAIS: ${data.extras}` : ""}

Sugira EXATAMENTE 2 testes com o seguinte formato para cada um:

### Teste 1: [Nome do Teste]
**Objetivo:** [Por que aplicar este teste]
**Formato:** [Como aplicar: escrita, prático, online, etc.]
**Duração:** [Tempo estimado]
**Competências Avaliadas:** [Lista das competências]
**Perfil Esperado:** [O que esperar de um bom candidato]

### Teste 2: [Nome do Teste]
[mesma estrutura]

Foque em testes relevantes, simples e aplicáveis para estágio.`,
  },

  // 5. Perfil DISC Ideal
  discPerfil: {
    system: `Você é um especialista em metodologia DISC e seu uso em recrutamento e seleção.
Sua tarefa é recomendar o perfil DISC ideal para vagas de estágio com base nas características da função.
Seja específico, didático e prático.
Explique de forma que qualquer recrutador entenda e use nas suas análises.`,

    user: (data: {
      titulo: string; area: string; atividades?: string;
      empresa?: string; responsabilidades?: string; extras?: string;
    }) => `Analise e recomende o perfil DISC ideal para a seguinte vaga de estágio:

VAGA: ${data.titulo}
ÁREA: ${data.area}
${data.empresa ? `EMPRESA: ${data.empresa}` : ""}
${data.atividades ? `ATIVIDADES:\n${data.atividades}` : ""}
${data.responsabilidades ? `RESPONSABILIDADES:\n${data.responsabilidades}` : ""}
${data.extras ? `CONTEXTO ADICIONAL:\n${data.extras}` : ""}

Gere uma análise DISC completa com:

## Perfil DISC Recomendado
**Perfil Primário:** [D / I / S / C] — [Nome]
**Perfil Secundário:** [D / I / S / C] — [Nome] (quando relevante)

## Por que este perfil?
[Justificativa baseada nas atividades e responsabilidades]

## Características Comportamentais Esperadas
[Lista de 4-5 características]

## Riscos Comportamentais
[Perfis que podem apresentar dificuldades e por quê]

## Perfil Complementar Ideal
[Para trabalho em equipe ou supervisão]

## Como usar no processo seletivo
[Dicas práticas para o recrutador]`,
  },
};
