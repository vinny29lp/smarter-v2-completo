/**
 * CRM — Follow-up Inteligente com Mensagens Prontas
 *
 * Biblioteca completa de mensagens comerciais organizadas por situação.
 * Cada situação possui:
 *   - id único
 *   - indicador visual (texto de aviso)
 *   - canal recomendado
 *   - mensagem WhatsApp pronta
 *   - mensagem e-mail pronta (quando aplicável)
 *   - próximo follow-up recomendado (em dias)
 */

export interface LeadFollowupContext {
  contato?: string | null;
  empresa?: string | null;
  setor?: string | null;
  cidade?: string | null;
  whatsapp?: string | null;
  telefone?: string | null;
  email?: string | null;
  franqueadoNome?: string | null;
  franqueadoCidade?: string | null;
  apresentacaoToken?: string | null;
  apresentacaoAcessos?: number | null;
  apresentacaoScrollMax?: number | null;
  apresentacaoTempoSeg?: number | null;
  apresentacaoCliques?: string | null;
  apresentacaoEnviadaEm?: string | Date | null;
  leadScore?: number | null;
}

export type CanalRecomendado = "whatsapp" | "email" | "ligacao" | "whatsapp_email" | "ligacao_whatsapp" | "aguardar";

export interface FollowupMensagem {
  whatsapp: string;
  emailAssunto?: string;
  emailCorpo?: string;
}

export interface FollowupSituacao {
  id: string;
  indicador: string;
  urgente: boolean;
  canal: CanalRecomendado;
  canalLabel: string;
  proximoFollowupDias: number;
  mensagem: FollowupMensagem;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nome(ctx: LeadFollowupContext): string {
  return ctx.contato ? ctx.contato.split(" ")[0] : "";
}
function saudacao(ctx: LeadFollowupContext): string {
  return nome(ctx) ? `Olá, ${nome(ctx)}! Tudo bem?` : "Olá! Tudo bem?";
}
function empresa(ctx: LeadFollowupContext): string {
  return ctx.empresa || "sua empresa";
}
function franqueado(ctx: LeadFollowupContext): string {
  return ctx.franqueadoNome || "Smarter Estágios";
}
function linkApresentacao(ctx: LeadFollowupContext): string {
  if (!ctx.apresentacaoToken) return "https://sistema.smarterestagios.com.br";
  return `https://sistema.smarterestagios.com.br/comercial/${ctx.apresentacaoToken}`;
}
function parseCliques(raw?: string | null): string[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean) : []; } catch { return []; }
}

// ─── Biblioteca de situações ──────────────────────────────────────────────────
function buildSituacoes(ctx: LeadFollowupContext): FollowupSituacao[] {
  const n = saudacao(ctx);
  const emp = empresa(ctx);
  const fq = franqueado(ctx);
  const link = linkApresentacao(ctx);

  return [
    // ─── 1 — Clicou em Agendar
    {
      id: "clicou_agendamento",
      indicador: "🔥 URGENTE: lead clicou em "Agendar conversa"! Entre em contato agora.",
      urgente: true,
      canal: "ligacao_whatsapp",
      canalLabel: "WhatsApp + Ligação",
      proximoFollowupDias: 0,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Vi que você clicou para agendar uma conversa com a Smarter Estágios. 🙌`,
          "",
          `Posso falar com você rapidamente para entender o perfil da ${emp} e ver como podemos ajudar na contratação de estagiários com segurança e praticidade?`,
          "",
          `Tenho horários disponíveis hoje. Qual fica melhor para você?`,
        ].join("\n"),
        emailAssunto: `Vamos conversar sobre estágio na ${emp}?`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Vi que você demonstrou interesse em agendar uma conversa com a Smarter Estágios.`,
          "",
          `Podemos falar rapidamente para entender o perfil da ${emp}, o tipo de vaga que faz sentido e como a Smarter pode apoiar todo o processo — da triagem ao TCE.`,
          "",
          `Fico à disposição para combinarmos o melhor horário.`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 2 — Clicou no WhatsApp
    {
      id: "clicou_whatsapp",
      indicador: "🔥 URGENTE: lead clicou no WhatsApp! Responda já.",
      urgente: true,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 0,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Vi que você tentou falar conosco pelo WhatsApp após acessar a apresentação da Smarter.`,
          "",
          `Estou por aqui para te ajudar! 😊`,
          "",
          `A ${emp} já tem alguma vaga ou área onde um estagiário poderia contribuir neste momento?`,
        ].join("\n"),
        emailAssunto: `Smarter Estágios — Retornando seu contato`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Vi que você acessou nossa apresentação e demonstrou interesse em conversar.`,
          "",
          `Estou à disposição para ajudar a ${emp} a entender como funciona o programa de estágio com a Smarter.`,
          "",
          `Quando ficaria bom para uma conversa rápida?`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 3 — Leu a apresentação inteira (scroll ≥ 100%)
    {
      id: "leu_tudo",
      indicador: "📖 Lead leu a apresentação inteira! Ótimo momento para ligar agora.",
      urgente: false,
      canal: "ligacao_whatsapp",
      canalLabel: "WhatsApp + Ligação",
      proximoFollowupDias: 0,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Vi que você conseguiu visualizar a apresentação completa da Smarter Estágios. 📖`,
          "",
          `Acredito que o programa de estágio pode fazer bastante sentido para a ${emp} — especialmente se vocês desejam formar talentos, reduzir burocracia e contratar com segurança.`,
          "",
          `Ficou alguma dúvida ou podemos conversar rapidamente para entender o perfil de vaga que sua empresa precisa?`,
        ].join("\n"),
        emailAssunto: `Sua opinião sobre a apresentação da Smarter Estágios`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Que bom que você conseguiu ver a apresentação completa da Smarter Estágios!`,
          "",
          `Acredito que o programa pode fazer sentido para a ${emp}. Podemos conversar brevemente para entender o perfil de vaga ideal e verificar quais estudantes temos disponíveis na região?`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 4 — Leu boa parte (scroll 75–99%)
    {
      id: "leu_maior_parte",
      indicador: "📖 Lead leu a maior parte — mostre-se disponível com um WhatsApp hoje.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 1,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Vi que você acessou boa parte da nossa apresentação sobre contratação de estagiários. 😊`,
          "",
          `Queria me colocar à disposição caso tenha ficado alguma dúvida sobre o processo, documentação, seguro ou abertura de vaga com a Smarter.`,
          "",
          `Se fizer sentido, posso te explicar tudo em poucos minutos.`,
        ].join("\n"),
        emailAssunto: `Dúvidas sobre o programa de estágio — Smarter Estágios`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Passando para me colocar à disposição caso tenha ficado alguma dúvida sobre a apresentação da Smarter Estágios.`,
          "",
          `Podemos conversar sobre o processo de contratação, documentação ou perfil de candidatos para a ${emp}.`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 5 — Acessou mais de uma vez
    {
      id: "multiplos_acessos",
      indicador: `👁️ Lead voltou à apresentação ${ctx.apresentacaoAcessos || 2}x — está considerando. Hora de ligar.`,
      urgente: false,
      canal: "ligacao_whatsapp",
      canalLabel: "Ligação + WhatsApp",
      proximoFollowupDias: 0,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Percebi que você acessou nossa apresentação algumas vezes. Isso costuma acontecer quando a empresa está avaliando melhor a possibilidade. 👁️`,
          "",
          `Posso te ajudar a entender qual modelo faria mais sentido para a ${emp} e quais perfis de estudantes poderiam apoiar sua equipe?`,
          "",
          `Cinco minutinhos são suficientes para esclarecer tudo.`,
        ].join("\n"),
        emailAssunto: `Quer conversar sobre estágio na ${emp}?`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Percebi que você acessou a apresentação da Smarter algumas vezes. Fico feliz que o tema esteja sendo avaliado!`,
          "",
          `Posso ajudar a entender qual modelo faria mais sentido para a ${emp} e esclarecer dúvidas sobre o processo.`,
          "",
          `Quando ficaria bom para uma conversa rápida?`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 6 — Abriu mas saiu rápido (bounce)
    {
      id: "saiu_rapido",
      indicador: "⚡ Lead abriu mas saiu rápido — mande um WhatsApp curto chamando atenção.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp curto",
      proximoFollowupDias: 1,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Vi que você abriu a apresentação da Smarter, mas talvez não tenha tido tempo de ver tudo. Sem problemas! 😊`,
          "",
          `Ela é bem rápida e mostra como a ${emp} pode contratar estagiários com segurança e menos burocracia.`,
          "",
          `Segue o link novamente:`,
          link,
          "",
          `Posso te ajudar com alguma dúvida inicial?`,
        ].join("\n"),
        emailAssunto: `Reenvio da apresentação — Smarter Estágios`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Passando para reenviar a apresentação da Smarter Estágios, caso não tenha conseguido ver tudo.`,
          "",
          `Ela mostra como a ${emp} pode contratar estagiários com segurança, documentação organizada e suporte completo.`,
          "",
          `Link de acesso:`,
          link,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 7 — Abriu e leu parcialmente (scroll 25–74%)
    {
      id: "leu_parcial",
      indicador: "✅ Lead abriu a apresentação — aguarde 24h e faça follow-up pelo WhatsApp.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 1,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Vi que você acessou a apresentação da Smarter Estágios. 👍`,
          "",
          `Queria saber se ficou alguma dúvida sobre como funciona a contratação de estagiários ou se existe alguma área na ${emp} onde um estudante poderia contribuir.`,
          "",
          `Estou por aqui!`,
        ].join("\n"),
        emailAssunto: `Ficou alguma dúvida sobre a apresentação da Smarter?`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Passando para saber se ficou alguma dúvida após ver a apresentação da Smarter Estágios.`,
          "",
          `Podemos conversar sobre como seria o processo para a ${emp}: abertura de vaga, triagem, documentação e acompanhamento.`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 8 — Abriu mas leu pouco (scroll < 25%)
    {
      id: "abriu_pouco",
      indicador: "✅ Lead abriu a apresentação — envie um WhatsApp perguntando se ficou alguma dúvida.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 1,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Passando para confirmar que a apresentação da Smarter chegou certinho. 😊`,
          "",
          `Qualquer dúvida sobre contratação de estagiários para a ${emp}, estou por aqui!`,
        ].join("\n"),
      },
    },

    // ─── 9 — Não abriu (≥ 2 dias)
    {
      id: "nao_abriu",
      indicador: `❄️ Lead não abriu em ${Math.floor((Date.now() - new Date(ctx.apresentacaoEnviadaEm || Date.now()).getTime()) / 86400000)} dia(s) — tente reenviar por outro canal.`,
      urgente: false,
      canal: "whatsapp_email",
      canalLabel: "WhatsApp ou E-mail",
      proximoFollowupDias: 3,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Passando rapidamente para reenviar a apresentação da Smarter Estágios.`,
          "",
          `Talvez você ainda não tenha tido tempo de visualizar — ela mostra de forma simples como a ${emp} pode contratar estagiários com segurança, documentação organizada e suporte completo.`,
          "",
          `Segue o link:`,
          link,
          "",
          `Posso te ajudar com alguma dúvida?`,
        ].join("\n"),
        emailAssunto: `Reenvio — Apresentação Smarter Estágios`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Estou reenviando a apresentação da Smarter Estágios, caso ainda não tenha conseguido visualizar.`,
          "",
          `Ela mostra como a ${emp} pode abrir vagas de estágio com segurança, apoio documental e acompanhamento durante todo o contrato.`,
          "",
          `Link de acesso:`,
          link,
          "",
          `Fico à disposição para qualquer dúvida.`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 10 — Aguardando abertura (< 24h)
    {
      id: "aguardando_abertura",
      indicador: "🕐 Apresentação enviada — aguarde o lead abrir antes de fazer follow-up.",
      urgente: false,
      canal: "aguardar",
      canalLabel: "Aguardar",
      proximoFollowupDias: 2,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Só passando para confirmar se você recebeu a apresentação da Smarter Estágios. 😊`,
          "",
          `Ela é rápida e pode ajudar a ${emp} a entender como abrir uma vaga de estágio com segurança e apoio completo.`,
          "",
          `Segue novamente:`,
          link,
        ].join("\n"),
      },
    },

    // ─── 11 — Lead quente (score ≥ 70)
    {
      id: "lead_quente",
      indicador: "🔥 Lead Quente — score alto. Este é o momento de fechar.",
      urgente: true,
      canal: "ligacao_whatsapp",
      canalLabel: "Ligação + WhatsApp",
      proximoFollowupDias: 0,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Pelo que observei, você demonstrou bastante interesse na apresentação da Smarter Estágios. 🙌`,
          "",
          `Acredito que vale conversarmos rapidamente para entender se a ${emp} tem alguma demanda atual para contratação de estagiários.`,
          "",
          `Posso te chamar para uma conversa rápida ainda hoje?`,
        ].join("\n"),
        emailAssunto: `Vamos fechar sua vaga de estágio — ${emp}?`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Você demonstrou bastante interesse no programa de estágio da Smarter. Que bom!`,
          "",
          `Gostaria de converter esse interesse em uma vaga real para a ${emp}. Posso te mostrar como é simples e rápido iniciar o processo.`,
          "",
          `Quando ficaria bom para uma conversa rápida?`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 12 — Lead morno (score 31–60)
    {
      id: "lead_morno",
      indicador: "🌡️ Lead Morno — mantenha o contato e esclareça dúvidas.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 2,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Queria saber se a apresentação da Smarter fez sentido para a ${emp}. 😊`,
          "",
          `Caso ainda estejam avaliando, posso ajudar explicando como funciona a abertura da vaga, triagem dos candidatos e formalização do estágio.`,
          "",
          `Estou à disposição!`,
        ].join("\n"),
      },
    },

    // ─── 13 — Lead frio (score ≤ 30)
    {
      id: "lead_frio",
      indicador: "❄️ Lead Frio — faça contato leve e deixe a porta aberta.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 5,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Passando para deixar a Smarter Estágios à disposição. 😊`,
          "",
          `Quando a ${emp} precisar contratar estagiários ou formar novos talentos, podemos ajudar em todo o processo — da divulgação da vaga à documentação.`,
          "",
          `Qualquer dúvida, estou por aqui!`,
        ].join("\n"),
      },
    },

    // ─── 14 — Após reunião agendada
    {
      id: "reuniao_agendada",
      indicador: "📅 Reunião agendada — confirme o horário com o lead.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 0,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Confirmando nossa conversa sobre contratação de estagiários para a ${emp}. 🤝`,
          "",
          `Vou te apresentar de forma objetiva como a Smarter pode ajudar na abertura da vaga, triagem dos candidatos, documentação e acompanhamento do estágio.`,
          "",
          `Até breve!`,
        ].join("\n"),
        emailAssunto: `Confirmação — Conversa Smarter Estágios x ${emp}`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Confirmando nossa conversa sobre o programa de estágio para a ${emp}.`,
          "",
          `Vou apresentar como a Smarter pode apoiar todo o processo: abertura de vaga, triagem, documentação e acompanhamento.`,
          "",
          `Qualquer dúvida antes da reunião, é só me chamar.`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 15 — Após reunião realizada
    {
      id: "pos_reuniao",
      indicador: "🤝 Reunião realizada — encaminhe os próximos passos.",
      urgente: false,
      canal: "whatsapp_email",
      canalLabel: "WhatsApp + E-mail",
      proximoFollowupDias: 1,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Obrigado pela conversa! Foi ótimo conhecer melhor a ${emp}. 🙌`,
          "",
          `Conforme alinhamos, a Smarter pode apoiar na contratação de estagiários, cuidando da divulgação, encaminhamento de candidatos, documentação, seguro e acompanhamento.`,
          "",
          `O próximo passo seria definirmos o perfil da vaga para iniciarmos a busca. Posso te enviar um modelo simples para levantamento do perfil?`,
        ].join("\n"),
        emailAssunto: `Próximos passos — Smarter Estágios x ${emp}`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Obrigado pela conversa!`,
          "",
          `Conforme alinhamos, a Smarter pode apoiar a ${emp} na contratação de estagiários — da divulgação à formalização do TCE.`,
          "",
          `Para iniciarmos, precisamos do perfil da vaga:`,
          `1. Cargo ou área`,
          `2. Atividades principais`,
          `3. Horário do estágio`,
          `4. Bolsa e benefícios`,
          `5. Curso ou nível de ensino`,
          `6. Modalidade (presencial / híbrido / remoto)`,
          "",
          `Aguardo seu retorno para iniciarmos!`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 16 — Interessado em abrir vaga
    {
      id: "abrir_vaga",
      indicador: "🎯 Lead interessado em abrir vaga — colete o perfil.",
      urgente: false,
      canal: "whatsapp_email",
      canalLabel: "WhatsApp + E-mail",
      proximoFollowupDias: 0,
      mensagem: {
        whatsapp: [
          `${nome(ctx) ? `${nome(ctx)}, p` : "P"}erfeito! Para iniciarmos a abertura da vaga da ${emp}, preciso de algumas informações:`,
          "",
          `1️⃣ Cargo ou área da vaga`,
          `2️⃣ Atividades principais`,
          `3️⃣ Horário do estágio`,
          `4️⃣ Bolsa e benefícios`,
          `5️⃣ Curso ou nível de ensino desejado`,
          `6️⃣ Modalidade: presencial, híbrido ou remoto`,
          `7️⃣ Endereço ou local de atuação`,
          "",
          `Com essas informações, já conseguimos estruturar a vaga e iniciar o processo! 🚀`,
        ].join("\n"),
        emailAssunto: `Perfil da vaga — ${emp} x Smarter Estágios`,
        emailCorpo: [
          `${n.replace("Tudo bem?", "").trim() || "Olá"}`,
          "",
          `Para iniciarmos a abertura da vaga da ${emp}, precisamos do perfil abaixo:`,
          "",
          `1. Cargo ou área da vaga`,
          `2. Atividades principais`,
          `3. Horário do estágio`,
          `4. Bolsa e benefícios`,
          `5. Curso ou nível de ensino desejado`,
          `6. Modalidade (presencial / híbrido / remoto)`,
          `7. Endereço ou local de atuação`,
          "",
          `Com essas informações, já iniciamos o processo de seleção!`,
          "",
          `Atenciosamente,`,
          `${fq}`,
          `Smarter Estágios`,
        ].join("\n"),
      },
    },

    // ─── 17 — Objeção de custo
    {
      id: "objecao_custo",
      indicador: "💬 Objeção de custo — mostre a comparação de valor.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 1,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Entendo perfeitamente. O objetivo do estágio é justamente permitir que a empresa desenvolva talentos com um investimento menor do que uma contratação tradicional — mantendo segurança jurídica e documentação correta.`,
          "",
          `Podemos avaliar juntos qual modelo faria mais sentido para a realidade da ${emp}?`,
          "",
          `São poucos minutos de conversa para entender o cenário.`,
        ].join("\n"),
      },
    },

    // ─── 18 — Objeção de burocracia
    {
      id: "objecao_burocracia",
      indicador: "💬 Objeção de burocracia — mostre que a Smarter resolve tudo.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 1,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Essa é uma preocupação muito comum — e completamente compreensível.`,
          "",
          `A boa notícia é que a Smarter cuida de toda a parte documental: TCE, seguro, plano de atividades e relacionamento com a instituição de ensino.`,
          "",
          `A ${emp} participa principalmente da escolha do candidato e do acompanhamento das atividades no dia a dia. O resto fica com a gente. 😊`,
        ].join("\n"),
      },
    },

    // ─── 19 — Lead pediu para falar depois
    {
      id: "retomar_contato",
      indicador: "🔄 Lead pediu para contatar depois — hora de retomar.",
      urgente: false,
      canal: "whatsapp",
      canalLabel: "WhatsApp",
      proximoFollowupDias: 0,
      mensagem: {
        whatsapp: [
          n,
          "",
          `Conforme combinamos, estou retomando nosso contato sobre contratação de estagiários para a ${emp}. 😊`,
          "",
          `Acredito que pode ser uma boa oportunidade para formar talentos e apoiar sua equipe com segurança e praticidade.`,
          "",
          `Faz sentido conversarmos esta semana?`,
        ].join("\n"),
      },
    },
  ];
}

// ─── Função principal — detecta a situação automaticamente ───────────────────
export function detectarSituacao(ctx: LeadFollowupContext): FollowupSituacao | null {
  if (!ctx.apresentacaoEnviadaEm) return null;

  const acessos  = ctx.apresentacaoAcessos || 0;
  const scroll   = ctx.apresentacaoScrollMax || 0;
  const tempo    = ctx.apresentacaoTempoSeg || 0;
  const score    = ctx.leadScore || 0;
  const dias     = Math.floor((Date.now() - new Date(ctx.apresentacaoEnviadaEm).getTime()) / 86400000);
  const cliques  = parseCliques(ctx.apresentacaoCliques);

  const situacoes = buildSituacoes(ctx);
  const find = (id: string) => situacoes.find(s => s.id === id)!;

  if (cliques.includes("clicou_agendamento")) return find("clicou_agendamento");
  if (cliques.includes("clicou_whatsapp"))    return find("clicou_whatsapp");
  if (acessos >= 1 && scroll >= 100)          return find("leu_tudo");
  if (acessos >= 1 && scroll >= 75)           return find("leu_maior_parte");
  if (acessos > 1  && scroll < 75)            return find("multiplos_acessos");
  if (acessos >= 1 && tempo < 30 && scroll < 25) return find("saiu_rapido");
  if (acessos >= 1 && scroll >= 25 && scroll < 75) return find("leu_parcial");
  if (acessos >= 1 && scroll < 25)            return find("abriu_pouco");
  if (acessos === 0 && dias >= 2)             return find("nao_abriu");
  if (acessos === 0 && dias < 2)              return find("aguardando_abertura");

  return null;
}

// ─── Todas as situações para dropdown manual ──────────────────────────────────
export function todasSituacoes(ctx: LeadFollowupContext): FollowupSituacao[] {
  return buildSituacoes(ctx);
}

// ─── Grupos para o dropdown ───────────────────────────────────────────────────
export const GRUPOS_FOLLOWUP = [
  { label: "🎯 Alta intenção",       ids: ["clicou_agendamento", "clicou_whatsapp", "leu_tudo"] },
  { label: "📖 Engajamento",         ids: ["leu_maior_parte", "multiplos_acessos", "leu_parcial", "abriu_pouco"] },
  { label: "❄️ Sem abertura",        ids: ["saiu_rapido", "nao_abriu", "aguardando_abertura"] },
  { label: "🌡️ Por temperatura",     ids: ["lead_quente", "lead_morno", "lead_frio"] },
  { label: "🤝 Processo comercial",  ids: ["reuniao_agendada", "pos_reuniao", "abrir_vaga", "retomar_contato"] },
  { label: "💬 Objeções",            ids: ["objecao_custo", "objecao_burocracia"] },
];

// ─── Próximo follow-up em data absoluta ──────────────────────────────────────
export function calcularProximoFollowup(situacao: FollowupSituacao): Date {
  const d = new Date();
  d.setDate(d.getDate() + situacao.proximoFollowupDias);
  return d;
}

// ─── Formatar número WhatsApp ─────────────────────────────────────────────────
export function buildWppUrl(telefone: string | null | undefined, texto: string): string | null {
  if (!telefone) return null;
  const raw = telefone.replace(/\D/g, "");
  if (!raw) return null;
  const phone = raw.startsWith("55") ? raw : `55${raw}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`;
}
