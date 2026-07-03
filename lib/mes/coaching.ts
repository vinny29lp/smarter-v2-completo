/**
 * coaching.ts — Gera mensagens de coaching por indicador para o relatório
 * de fechamento de mês, comparando os números reais com as metas declaradas
 * na abertura do mês.
 */

export interface MensagemCoaching {
  indicador: string;
  nivel: "critico" | "atencao" | "bom";
  mensagem: string;
  acao: string;
}

export interface DadosFechamento {
  empresasCadastradas: number;
  leadsNoMes: number;
  contratosFirmados: number;
  horasNoSistema: number;
}

export interface MetasAbertura {
  metaEmpresas?: number | null;
  metaLeads?: number | null;
}

export function gerarMensagens(dados: DadosFechamento, metas: MetasAbertura): MensagemCoaching[] {
  const msgs: MensagemCoaching[] = [];

  // Empresas
  const pctEmpresas = dados.empresasCadastradas / Math.max(1, metas.metaEmpresas ?? 10);
  if (pctEmpresas < 0.3) {
    msgs.push({
      indicador: "Prospecção de Empresas",
      nivel: "critico",
      mensagem: `Você cadastrou apenas ${dados.empresasCadastradas} empresa(s) este mês, muito abaixo da sua meta de ${metas.metaEmpresas ?? 10}. Sem empresas ativas no sistema, não há vagas para preencher — e sem vagas, não há estagiários, não há contratos, não há receita. Nenhum negócio cresce esperando o cliente aparecer. Reserve 30 minutos por dia para prospecção ativa: ligue, visite, envie mensagem. 1 empresa por dia = 20 novos contatos no mês.`,
      acao: "Meta para o próximo mês: cadastrar pelo menos " + Math.max(5, (metas.metaEmpresas ?? 10)) + " empresas.",
    });
  } else if (pctEmpresas < 0.7) {
    msgs.push({
      indicador: "Prospecção de Empresas",
      nivel: "atencao",
      mensagem: `Você cadastrou ${dados.empresasCadastradas} empresa(s), chegando a ${Math.round(pctEmpresas * 100)}% da sua meta. Progresso real, mas ainda há espaço para crescer. Continue a prospecção e tente aumentar o ritmo na segunda quinzena.`,
      acao: "Meta: aumentar em 30% o número de empresas cadastradas no próximo mês.",
    });
  } else {
    msgs.push({
      indicador: "Prospecção de Empresas",
      nivel: "bom",
      mensagem: `Excelente prospecção! ${dados.empresasCadastradas} empresas cadastradas, atingindo ${Math.round(pctEmpresas * 100)}% da sua meta. Mantenha o ritmo e foque em converter essas empresas em vagas abertas.`,
      acao: "Próximo passo: garantir que todas as empresas ativas tenham pelo menos 1 vaga cadastrada.",
    });
  }

  // Leads CRM
  const pctLeads = dados.leadsNoMes / Math.max(1, metas.metaLeads ?? 10);
  if (pctLeads < 0.3) {
    msgs.push({
      indicador: "CRM — Captação de Leads",
      nivel: "critico",
      mensagem: `Apenas ${dados.leadsNoMes} lead(s) no CRM este mês. O funil de vendas começa aqui: sem leads, sem apresentações, sem negócios fechados. Se você não está prospectando ativamente, sua unidade depende só da sorte. Use o link da unidade em redes sociais, WhatsApp e feiras para atrair mais empresas interessadas.`,
      acao: "Ação imediata: compartilhar o link da unidade em pelo menos 3 canais diferentes.",
    });
  } else if (pctLeads < 0.7) {
    msgs.push({
      indicador: "CRM — Captação de Leads",
      nivel: "atencao",
      mensagem: `${dados.leadsNoMes} lead(s) no mês — você está no caminho certo, mas pode acelerar. Verifique quais canais estão trazendo mais resultados e duplique o esforço neles.`,
      acao: "Revisar a origem dos leads e intensificar os canais com melhor conversão.",
    });
  } else {
    msgs.push({
      indicador: "CRM — Captação de Leads",
      nivel: "bom",
      mensagem: `Ótimo volume de leads — ${dados.leadsNoMes} novos contatos no mês. Certifique-se de que está acompanhando cada um com follow-up dentro do prazo.`,
      acao: "Revisar todos os leads sem follow-up há mais de 7 dias.",
    });
  }

  // Horas no sistema
  if (dados.horasNoSistema < 20) {
    msgs.push({
      indicador: "Tempo de Gestão",
      nivel: "critico",
      mensagem: `Você ficou apenas ${dados.horasNoSistema.toFixed(1)} horas no sistema este mês — menos de 1 hora por dia útil. Gestão eficiente exige presença. Sem acompanhar seus contratos, leads e estudantes regularmente, problemas aparecem tarde demais para resolver. Seu negócio precisa de você todos os dias.`,
      acao: "Compromisso: acessar o sistema pelo menos 1 hora por dia nos próximos 30 dias.",
    });
  } else if (dados.horasNoSistema < 40) {
    msgs.push({
      indicador: "Tempo de Gestão",
      nivel: "atencao",
      mensagem: `${dados.horasNoSistema.toFixed(1)} horas no sistema — você está engajado, mas aumentar para 40h mensais pode melhorar significativamente seus resultados.`,
      acao: "Meta: 2 horas por dia nos dias úteis.",
    });
  } else {
    msgs.push({
      indicador: "Tempo de Gestão",
      nivel: "bom",
      mensagem: `${dados.horasNoSistema.toFixed(1)} horas no sistema — você está dedicado à gestão da sua unidade. Esse nível de envolvimento é o que diferencia as unidades que crescem das que estacionam.`,
      acao: "Continue. Consistência é o maior ativo de um franqueado bem-sucedido.",
    });
  }

  // Contratos
  if (dados.contratosFirmados === 0) {
    msgs.push({
      indicador: "Contratos",
      nivel: "critico",
      mensagem: `Nenhum contrato firmado este mês. Contrato é o produto final do seu trabalho — é o que gera receita para você e para a rede. Se você tem empresas cadastradas e estudantes no sistema mas não está convertendo em contratos, há um gargalo no seu processo comercial que precisa ser identificado.`,
      acao: "Verificar quantas vagas abertas existem sem candidatos e agir imediatamente.",
    });
  }

  return msgs;
}
