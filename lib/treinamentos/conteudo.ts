/** Conteúdo do treinamento de operação da unidade (aba Treinamentos). */
export interface Aula { id: string; titulo: string; texto: string; passos?: string[]; dica?: string; link?: { href: string; rotulo: string } }
export interface Modulo { id: string; titulo: string; resumo: string; aulas: Aula[] }

export const MODULOS: Modulo[] = [
  {
    id: "comecar", titulo: "1. Começando: primeiro acesso e sistema liberado",
    resumo: "A Lia guia a configuração. Quando chega a 100%, o sistema libera.",
    aulas: [
      { id: "assistente", titulo: "O assistente da Lia", texto: "No primeiro acesso a Lia conduz você pelos passos: dados da unidade, região de atuação, tour pelas telas principais e abertura do mês. O sistema só libera quando tudo estiver concluído.",
        passos: ["Confira e complete os dados da unidade.", "Confirme a região de atuação (cidades e bairros) que a franqueadora cadastrou.", "Faça o tour de cada tela, sem pular.", "Abra o mês de operação.", "Clique em “Liberar meu sistema”."],
        dica: "Se a região estiver errada, peça ajuste à franqueadora: é ela que define onde o Victor prospecta." },
    ],
  },
  {
    id: "victor", titulo: "2. Victor (Sales): empresas da sua região",
    resumo: "Ele traz as empresas. Você faz o contato humano.",
    aulas: [
      { id: "regiao", titulo: "Como o Victor trabalha", texto: "O Victor busca empresas somente nas regiões cadastradas para a sua unidade, registra cada uma no CRM com os contatos disponíveis e envia o primeiro e-mail. A prospecção depende da integração com a Alizo, que é conectada pela Smarter; você não precisa abrir nenhum painel externo." },
      { id: "humano", titulo: "Contato humano: a parte mais importante", texto: "Cada empresa captada aparece marcada como “contato humano pendente”, com aviso grande em Hoje e no CRM. O e-mail abre a porta; a conversa fecha.",
        passos: ["Abra Hoje ou o CRM e veja os avisos de contato humano.", "Envie a mensagem pronta pelo WhatsApp (o botão já abre a conversa) ou ligue.", "Copie o link de apresentação mostrado no CRM e envie por WhatsApp.", "Marque o resultado: contatado, agendou ou sem interesse."],
        dica: "Trate todos os avisos no mesmo dia. É o maior risco do começo do negócio.", link: { href: "/dashboard/crm", rotulo: "Abrir o CRM" } },
    ],
  },
  {
    id: "empresas-vagas", titulo: "3. Empresa interessada → vaga aberta",
    resumo: "Do “quero um estagiário” até candidatos aceitando.",
    aulas: [
      { id: "empresa", titulo: "Cadastrar a empresa", texto: "Cadastre a empresa em Empresas. O sistema bloqueia CNPJ duplicado e informa onde a empresa já está cadastrada.", link: { href: "/dashboard/empresas", rotulo: "Abrir Empresas" } },
      { id: "levantamento", titulo: "Levantamento de perfil", texto: "Na ficha da empresa, use “Levantamento de perfil (copiar link)” ou “Enviar levantamento por WhatsApp”. A empresa informa título, preferências, curso, atividades, bolsa e horário.",
        dica: "Sempre gere o link pela ficha da empresa. Links antigos não abrem a vaga sozinhos: a solicitação fica pendente para você revisar." },
      { id: "vaga", titulo: "A vaga abre e a Lia convida", texto: "Quando a empresa envia o levantamento, o sistema abre a vaga com link público, avisa a unidade e a Lia convida por e-mail os estudantes compatíveis da região, com a descrição da vaga.",
        passos: ["Acompanhe os interessados na vaga.", "Chame candidatos pelo WhatsApp com a mensagem pronta.", "Sem candidatos? Use o guia de divulgação: escolas, Indeed, InfoJobs e redes sociais, com texto pronto.", "Com 1 ou 2 aceites, marque o processo seletivo com a empresa."], link: { href: "/dashboard/vagas", rotulo: "Abrir Vagas" } },
    ],
  },
  {
    id: "contratos", titulo: "4. Contratos e documentos",
    resumo: "Do processo seletivo ao contrato assinado.",
    aulas: [
      { id: "contratos", titulo: "Gerar e acompanhar", texto: "Depois do processo seletivo, gere o contrato em Contratos e envie para assinatura. A Lia avisa renovações, avaliação semestral, fim de estágio e limite de 2 anos.",
        dica: "Ao emitir recibo de rescisão, se o motivo não estiver salvo o sistema abre uma caixa para escolher.", link: { href: "/dashboard/contratos", rotulo: "Abrir Contratos" } },
    ],
  },
  {
    id: "rotina", titulo: "5. Sua rotina diária (cerca de 1 hora)",
    resumo: "Comece sempre pela tela Hoje.",
    aulas: [
      { id: "hoje", titulo: "Ordem do dia", texto: "A tela Hoje lista as tarefas por urgência. Resolva nesta ordem:",
        passos: ["Contatos humanos pendentes.", "Vagas prontas para seleção.", "Vagas sem candidatos.", "Contratos e documentos pendentes.", "Retornos de empresas que demoram a responder."], link: { href: "/dashboard/hoje", rotulo: "Abrir Hoje" } },
    ],
  },
  {
    id: "semana1", titulo: "6. Plano da primeira semana",
    resumo: "Metas sugeridas para acompanhar (não são garantia).",
    aulas: [
      { id: "plano", titulo: "Checklist da semana", texto: "Use como referência para saber se você está no ritmo:",
        passos: ["Dia 1: assistente concluído e mês aberto.", "Dia 2: região conferida e primeiras empresas no CRM.", "Dia 3: primeiros contatos humanos feitos.", "Dia 5: primeira empresa interessada com levantamento enviado.", "Todo dia: 100% dos avisos de contato humano tratados."] },
    ],
  },
];
