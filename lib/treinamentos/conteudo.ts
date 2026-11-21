/** Conteúdo do treinamento de operação da unidade (aba Treinamentos). */
export interface Aula { id: string; titulo: string; texto: string; passos?: string[]; dica?: string; link?: { href: string; rotulo: string } }
export interface Modulo { id: string; titulo: string; resumo: string; aulas: Aula[] }

export const MODULOS: Modulo[] = [
  {
    id: "equipe-digital", titulo: "0. Sua equipe digital: quem faz o quê",
    resumo: "Quatro funcionários digitais trabalham todos os dias. Você é o contato humano.",
    aulas: [
      { id: "equipe-visao", titulo: "Visão geral da equipe", texto: "A sua unidade nasce com uma equipe digital que cuida do trabalho repetitivo para você ficar na rua, com empresas e escolas. Cada um tem uma função e um limite claro: o que eles NÃO fazem é justamente o que só você consegue fazer.",
        passos: ["Lia (administrativo e RH): envia e-mails de convite, lembretes, renovações, avaliações semestrais e avisos de prazo de contrato e de fim de estágio. Ela NÃO fecha negócio com empresa.",
          "Victor (Sales/comercial): busca empresas na SUA região, registra no CRM e envia o primeiro e-mail. Ele NÃO visita nem negocia: o contato humano é seu.",
          "Recrutador (RH): espelha as vagas e envia candidatos que deram consentimento. A decisão de quem segue no processo é sua e da empresa.",
          "Felipe (TI e suporte): atende problemas do sistema com aprovação humana. Dúvidas e erros vão para ele, não para a Matriz."],
        dica: "Regra de ouro: a equipe digital abre a porta, você fecha o contrato. Tratar os avisos de “contato humano” no mesmo dia é o que mais separa as unidades que crescem das que travam." },
      { id: "equipe-crescer", titulo: "Como a unidade cresce com o apoio da IA", texto: "O crescimento vem de um ciclo simples: o Victor traz empresas, você as visita, a empresa abre vaga, a Lia convida estudantes, o processo seletivo acontece e o contrato é gerado. Cada contrato ativo gera receita recorrente de gestão, e a Lia mantém tudo em dia sem você precisar lembrar de prazos.",
        passos: ["Empresa captada pelo Victor → contato humano seu.", "Visita e apresentação → proposta comercial → empresa interessada.", "Levantamento de perfil → vaga aberta → Lia convida estudantes.", "Processo seletivo → contrato assinado → receita recorrente.", "Renovações, avaliações e fim de estágio acompanhados pela Lia."] },
    ],
  },
  {
    id: "comecar", titulo: "1. Começando: primeiro acesso e sistema liberado",
    resumo: "A Lia guia a configuração. Quando chega a 100%, o sistema libera.",
    aulas: [
      { id: "assistente", titulo: "O assistente da Lia", texto: "No primeiro acesso a Lia conduz você pelos passos: dados da unidade, região de atuação, tour pelas telas principais e abertura do mês. O sistema só libera quando tudo estiver concluído.",
        passos: ["Confira e complete os dados da unidade.", "Confirme a região de atuação (cidades e bairros) que a franqueadora cadastrou.", "Faça o tour de cada tela, sem pular.", "Abra o mês de operação.", "Clique em “Liberar meu sistema”."],
        dica: "Se a região estiver errada, peça ajuste à franqueadora: é ela que define onde o Victor prospecta. Em unidade nova, o sistema só é liberado depois deste treinamento (quiz com 8 acertos em 10) e do assistente da Lia." },
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
        passos: ["Acompanhe os interessados na vaga.", "Chame candidatos pelo WhatsApp com a mensagem pronta.", "Sem candidatos? Use o guia de divulgação: escolas, Indeed, InfoJobs e redes sociais, com texto pronto.", "Com 1 ou 2 aceites, marque o processo seletivo com a empresa.", "Vaga sem nenhum movimento por 60 dias é pausada; pausada por mais 30 dias sem interação vai para a Lixeira (fica 90 dias e pode ser restaurada)."], link: { href: "/dashboard/vagas", rotulo: "Abrir Vagas" } },
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
  {
    id: "rota30", titulo: "7. Rota dos 30 contratos",
    resumo: "O objetivo inicial da unidade e o ritmo semanal para chegar lá.",
    aulas: [
      { id: "meta30", titulo: "A meta: 30 contratos fechados", texto: "O objetivo inicial de toda unidade é chegar a 30 contratos de estágio ativos. Esse número é o que sustenta a operação com folga e é alcançado com constância semanal, não com esforço concentrado.",
        passos: ["Meta semanal: visitar e apresentar a Smarter a pelo menos 10 empresas por semana.", "Todo dia: tratar 100% dos avisos de contato humano do Victor.", "Depois de cada visita: registrar no CRM e combinar o próximo passo com a empresa.", "Toda empresa interessada vira levantamento de perfil e vaga no mesmo dia.", "Toda sexta: olhar quantas visitas, propostas e contratos a semana teve."],
        dica: "Dez visitas por semana, com a aproximação do Victor, formam um funil previsível: parte vira conversa, parte vira proposta, parte vira contrato. O que não funciona se enxerga no CRM, e a Matriz acompanha com você." },
      { id: "rotina-visita", titulo: "Como fazer uma boa visita", texto: "A visita é curta e objetiva. Leve a apresentação, a proposta comercial e o link de levantamento de perfil. O foco é entender a necessidade da empresa e mostrar que a Smarter cuida de toda a burocracia legal do estágio.",
        passos: ["Antes: leia a empresa no CRM e use a mensagem pronta do Victor.", "Na visita: apresente, pergunte quantos estagiários e quais cursos, deixe a proposta.", "Depois: envie o link de levantamento por WhatsApp no mesmo dia.", "Retorno: combine data e registre. Quem retorna em até 48h costuma fechar mais."] },
    ],
  },
];
