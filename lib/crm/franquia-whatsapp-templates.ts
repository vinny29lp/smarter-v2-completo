/**
 * CRM de Franquias — Templates de mensagem WhatsApp
 * Todos os textos são específicos para a venda de unidades Smarter.
 *
 * Uso: buildFranquiaWhatsAppUrl(template, lead)
 */

export interface FranquiaWhatsTemplate {
  key: string;
  label: string;
  categoria: "ativo" | "reaquecimento";
  emoji: string;
  descricao: string;
  texto: (nome: string, cidade?: string | null) => string;
}

const WHATSAPP_NUMBER = "5511999999999"; // Número da Smarter (centralizado)

export const FRANQUIA_WHATS_TEMPLATES: FranquiaWhatsTemplate[] = [
  // ─── LEADS ATIVOS ───────────────────────────────────────────────────────────
  {
    key: "primeiro_contato",
    label: "Primeiro Contato",
    categoria: "ativo",
    emoji: "👋",
    descricao: "Abordagem inicial para lead novo captado de tráfego pago",
    texto: (nome, cidade) =>
      `Olá, ${nome.split(" ")[0]}! Tudo bem? 😊\n\nVi que você demonstrou interesse em empreender com a *Smarter Estágios*${cidade ? ` em ${cidade}` : ""}.\n\nA Smarter é uma rede de franquias que atua no mercado de estágios — um setor que cresceu *37% em 2024* e tem mais de *20 milhões de estudantes elegíveis* aguardando oportunidades.\n\nTem 15 minutinhos para uma conversa rápida? Posso te apresentar tudo! 🚀`,
  },
  {
    key: "apresentacao_mercado",
    label: "Apresentação do Mercado",
    categoria: "ativo",
    emoji: "📊",
    descricao: "Apresentar dados do mercado e vantagens da franquia",
    texto: (nome) =>
      `${nome.split(" ")[0]}, vou te passar alguns dados que costumam surpreender todo mundo:\n\n📈 *877 mil estagiários ativos em 2024* — crescimento de 37% em um ano\n🎓 *20 milhões de estudantes elegíveis* — apenas 4,5% está em estágio\n💼 Mercado de franquias educacionais: *R$ 15,5 bilhões*\n\nIsso significa que o mercado local de qualquer cidade médio-grande está *praticamente inexplorado*.\n\nA Smarter te coloca exatamente nesse mercado, com tecnologia, suporte e um modelo que já funciona. Quer entender como? 😊`,
  },
  {
    key: "roi_investimento",
    label: "ROI e Investimento",
    categoria: "ativo",
    emoji: "💰",
    descricao: "Apresentar os números financeiros da franquia",
    texto: (nome, cidade) =>
      `${nome.split(" ")[0]}, deixa eu te mostrar os números da Smarter de forma direta:\n\n🏷️ *Investimento inicial:* R$ 6.000 (Projeto Expansão)\n📅 *Retorno estimado:* ~4 meses\n♻️ *Receita:* recorrente, paga por empresa parceira por estagiário ativo\n📈 *Scalabilidade:* sem limite de faturamento — quanto mais empresas, mais você ganha\n\nNão exige ponto físico para começar${cidade ? ` em ${cidade}` : ""}. Modelo home/escritório.\n\nFaz sentido conversarmos sobre os detalhes? 🤝`,
  },
  {
    key: "proposta_enviada",
    label: "Avisar sobre Proposta",
    categoria: "ativo",
    emoji: "📋",
    descricao: "Informar que a proposta formal foi enviada por e-mail",
    texto: (nome) =>
      `${nome.split(" ")[0]}, acabei de enviar a *proposta formal* para o seu e-mail! 📧\n\nNo documento você encontra:\n✅ Valor do investimento\n✅ O que está incluso (plataforma, treinamento, materiais)\n✅ Projeção de retorno\n✅ Próximos passos para assinar\n\nDá uma olhada e me fala o que acha! Qualquer dúvida, estou aqui. 😊`,
  },
  {
    key: "follow_up_proposta",
    label: "Follow-up da Proposta",
    categoria: "ativo",
    emoji: "🔔",
    descricao: "Verificar se leu a proposta e tirar dúvidas",
    texto: (nome) =>
      `Olá, ${nome.split(" ")[0]}! Passando para saber se você teve a oportunidade de ver a proposta que enviei. 😊\n\nSei que a rotina é corrida, mas não queria que essa oportunidade passasse sem você ter todas as informações.\n\nTem alguma dúvida que posso esclarecer? Posso adaptar qualquer detalhe da proposta para sua realidade. 🤝\n\nMe fala como posso ajudar!`,
  },

  // ─── REAQUECIMENTO ──────────────────────────────────────────────────────────
  {
    key: "reaquecimento_suave",
    label: "🧊 Reaquecimento Suave",
    categoria: "reaquecimento",
    emoji: "🌡️",
    descricao: "Primeiro contato com lead frio — abordagem leve, sem pressão",
    texto: (nome) =>
      `Olá, ${nome.split(" ")[0]}! Aqui é da Smarter Estágios. 😊\n\nPassamos um tempo sem nos falar, mas quis te dar um oi porque o mercado de estágios não parou de crescer.\n\nEm 2024, foram *877 mil estagiários ativos* — um crescimento de 37% em um ano. E a maioria das cidades ainda tem enorme potencial inexplorado.\n\nCaso você ainda pense em empreender no futuro, adoraria retomar a conversa quando fizer sentido para você. Sem pressão! 🙂`,
  },
  {
    key: "reaquecimento_urgencia",
    label: "🧊 Reaquecimento com Urgência",
    categoria: "reaquecimento",
    emoji: "⚡",
    descricao: "Para leads frios com senso de urgência — vagas limitadas",
    texto: (nome, cidade) =>
      `${nome.split(" ")[0]}, tudo bem? Aqui é da *Smarter Estágios*.\n\nEstou entrando em contato porque as vagas do *Projeto Expansão* (R$ 6.000 de investimento) estão se esgotando para ${cidade ? cidade : "sua região"} e pensei em você.\n\n📈 Mercado cresceu 37% em 2024\n💰 Retorno estimado em 4 meses\n🏡 Sem necessidade de ponto físico\n\nSeria uma pena essa oportunidade passar. Tem 10 minutinhos para uma conversa rápida? ⏰`,
  },
  {
    key: "reaquecimento_novidade",
    label: "🧊 Reaquecimento — Novidade",
    categoria: "reaquecimento",
    emoji: "✨",
    descricao: "Reaquecer lead com update de produto ou mercado",
    texto: (nome) =>
      `Oi, ${nome.split(" ")[0]}! Aqui é da Smarter Estágios 😊\n\nTenho uma novidade que quero compartilhar com você:\n\nA Smarter lançou melhorias na plataforma tecnológica — *seleção por perfil comportamental DISC, TCE digital, portal exclusivo para empresas* — tudo incluso para o franqueado.\n\nIsso significa que você oferece para seus clientes algo que poucas agências de estágios têm no Brasil.\n\nValeria uma conversa rápida para te contar mais? 🚀`,
  },
];

/** Monta a URL do WhatsApp com a mensagem formatada */
export function buildFranquiaWhatsAppUrl(
  templateKey: string,
  lead: { nomeCompleto: string; telefone?: string | null; cidade?: string | null },
): string | null {
  const tpl = FRANQUIA_WHATS_TEMPLATES.find((t) => t.key === templateKey);
  if (!tpl || !lead.telefone) return null;

  const numero = lead.telefone.replace(/\D/g, "");
  const texto  = tpl.texto(lead.nomeCompleto, lead.cidade);
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** Retorna todos os templates ativos */
export function getAllFranquiaActiveTemplates() {
  return FRANQUIA_WHATS_TEMPLATES.filter((t) => t.categoria === "ativo");
}

/** Retorna todos os templates de reaquecimento */
export function getAllFranquiaReaquecimentoTemplates() {
  return FRANQUIA_WHATS_TEMPLATES.filter((t) => t.categoria === "reaquecimento");
}
