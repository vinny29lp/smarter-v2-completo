/**
 * CRM — Templates de mensagem WhatsApp comercial por etapa
 *
 * COMO EDITAR:
 *   Altere apenas o texto das funções. Não altere as chaves do objeto.
 *   Variáveis: {empresa}, {contato}, {setor}
 *   Emojis são suportados pelo WhatsApp.
 *
 * O link gerado segue o padrão: https://api.whatsapp.com/send?phone=55{ddd}{numero}&text={mensagem}
 */

export interface WhatsAppTemplate {
  label: string;   // nome exibido no botão
  message: (p: { empresa: string; contato?: string | null; setor?: string | null }) => string;
}

const TEMPLATES: Record<string, WhatsAppTemplate> = {

  /** Primeiro contato — apresentação */
  primeiro_contato: {
    label: "Apresentação Smarter",
    message: (p) => [
      `Olá${p.contato ? `, ${p.contato.split(" ")[0]}` : ""}! 👋`,
      ``,
      `Sou da *Smarter Estágios* e vi que a *${p.empresa}* demonstrou interesse em nossos serviços de gestão de estágios.`,
      ``,
      `Cuidamos de todo o processo para a sua empresa — recrutamento, TCE, documentação e conformidade com a Lei 11.788/2008 — com *custo até 70% menor que um colaborador CLT*.`,
      ``,
      `Posso tirar 20 minutos com você para apresentar como funciona? Qual seria o melhor horário? 😊`,
    ].join("\n"),
  },

  /** Antes da reunião */
  apresentacao: {
    label: "Confirmação de Reunião",
    message: (p) => [
      `Olá${p.contato ? `, ${p.contato.split(" ")[0]}` : ""}! 🤝`,
      ``,
      `Passando para confirmar nossa apresentação da *Smarter Estágios* para a *${p.empresa}*.`,
      ``,
      `Na reunião vamos mostrar:`,
      `✅ Cálculo real de economia para o seu porte`,
      `✅ Perfis de candidatos disponíveis${p.setor ? ` em *${p.setor}*` : ""}`,
      `✅ Como funciona nossa gestão completa de estágio`,
      ``,
      `Alguma dúvida antes da reunião? 😊`,
    ].join("\n"),
  },

  /** Follow-up proposta */
  proposta: {
    label: "Follow-up da Proposta",
    message: (p) => [
      `Olá${p.contato ? `, ${p.contato.split(" ")[0]}` : ""}! 👋`,
      ``,
      `Espero que tenha recebido nossa proposta para a *${p.empresa}*. Gostaria de saber se surgiu alguma dúvida sobre os valores ou condições.`,
      ``,
      `Estamos flexíveis para adequar ao momento da empresa — podemos conversar sobre quantidade de estagiários, prazo ou formato de contrato.`,
      ``,
      `Fica à vontade para me chamar aqui! 😊`,
    ].join("\n"),
  },

  /** Reforço em negociação */
  negociacao: {
    label: "Reforço Comercial",
    message: (p) => [
      `Olá${p.contato ? `, ${p.contato.split(" ")[0]}` : ""}! 🙌`,
      ``,
      `Oi! Aqui é da *Smarter Estágios*. Queria compartilhar um dado rápido sobre empresas${p.setor ? ` do setor de *${p.setor}*` : ""} como a *${p.empresa}*:`,
      ``,
      `📊 Em média, nossas parceiras economizam *R$ 1.800/mês por estagiário* em comparação com um colaborador júnior CLT.`,
      ``,
      `🚀 Além disso, o prazo médio para ter o candidato na função é de *5 dias úteis* após a aprovação.`,
      ``,
      `Podemos fechar essa semana? Qual o melhor momento para uma conversa rápida? 😊`,
    ].join("\n"),
  },

  /** Boas-vindas ao fechar */
  fechado: {
    label: "Boas-vindas ao Parceiro",
    message: (p) => [
      `Olá${p.contato ? `, ${p.contato.split(" ")[0]}` : ""}! 🎉`,
      ``,
      `É um prazer enorme ter a *${p.empresa}* como parceira da *Smarter Estágios*!`,
      ``,
      `A partir de agora, nossa equipe está à disposição para garantir a melhor experiência no programa de estágio de vocês.`,
      ``,
      `Em breve você receberá o contrato de parceria e os próximos passos para iniciarmos as seleções. Qualquer dúvida, estou aqui! 😊`,
    ].join("\n"),
  },

  /** Reengajamento genérico */
  reengajamento: {
    label: "Reengajamento",
    message: (p) => [
      `Olá${p.contato ? `, ${p.contato.split(" ")[0]}` : ""}! 👋`,
      ``,
      `Faz um tempo que não nos falamos e queria retomar o contato. A *Smarter Estágios* tem novidades que podem interessar à *${p.empresa}*!`,
      ``,
      `📌 Novas turmas de candidatos disponíveis${p.setor ? ` na área de *${p.setor}*` : ""}`,
      `📌 Condições especiais para novos contratos este mês`,
      ``,
      `Podemos retomar nossa conversa? 😊`,
    ].join("\n"),
  },
};

export function getWhatsAppTemplate(etapa: string): WhatsAppTemplate | null {
  return TEMPLATES[etapa] || TEMPLATES.reengajamento;
}

export function getAllWhatsAppTemplates(): Record<string, WhatsAppTemplate> {
  return TEMPLATES;
}

export function buildWhatsAppUrl(
  telefone: string,
  template: WhatsAppTemplate,
  params: { empresa: string; contato?: string | null; setor?: string | null }
): string {
  const raw = telefone.replace(/\D/g, "");
  const phone = raw.startsWith("55") ? raw : `55${raw}`;
  const text = template.message(params);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}
