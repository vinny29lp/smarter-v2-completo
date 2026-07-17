/**
 * sistemaSmarter.ts — Base de conhecimento operacional do Sistema Smarter (fluxos de UI).
 *
 * Destilado de uma investigação somente-leitura do código-fonte (2026-07-17), registrada
 * na íntegra em docs/lia-knowledge-base-raw.md (se ainda existir no repo). Esta é a fonte
 * de verdade que a Lia deve usar para explicar "como fazer X" dentro do sistema — nomes de
 * aba/botão/campo aqui são cópia literal da UI, não paráfrase.
 *
 * Regra de uso pela Lia: se o passo a passo de algo não estiver coberto aqui, ou estiver
 * marcado como "não confirmado", a Lia deve dizer que não tem certeza desse detalhe e
 * sugerir confirmar com o time da Smarter — nunca inventar um botão, aba ou passo que não
 * está descrito abaixo.
 */

export interface FluxoSistema {
  area: string;
  paraQuem: string;
  rota?: string;
  passos: string[];
  observacoes?: string[];
}

export const FLUXOS_SISTEMA: FluxoSistema[] = [
  {
    area: "Instituições de Ensino (IES) — cadastro geral",
    paraQuem: "Franqueadora, Franqueado, Funcionário/Equipe com permissão \"instituicoes\"",
    rota: "/dashboard/instituicoes",
    passos: [
      'No menu lateral, clique em "Instituições".',
      'Clique em "+ Nova Instituição".',
      'Preencha: Nome*, Razão Social, CNPJ, Tipo (Publica Federal / Publica Estadual / Privada / Tecnica / EJA / Outro), E-mail, Telefone, Coordenador(a), Cargo, Endereço, Cidade, UF, CEP.',
      'Clique em "Cadastrar Instituição".',
    ],
    observacoes: [
      "Esse cadastro NÃO gera link de convênio nem token de portal — é só a base cadastral (usada para vincular estudantes/contratos).",
      "Para enviar convênio, é preciso o fluxo separado \"Convênio/Portal de Adesão IES\" (ver próximo item) — são duas áreas diferentes.",
    ],
  },
  {
    area: "Convênio com IES — enviar link/minuta (ponto que mais gera confusão)",
    paraQuem: "Franqueadora, Franqueado, Funcionário (Equipe NÃO tem acesso a este fluxo)",
    rota: "/dashboard/ies (NÃO existe no menu lateral — só se chega por um link dentro da ficha da instituição)",
    passos: [
      'Primeiro cadastre a IES em "Instituições" (fluxo acima), se ainda não existir.',
      'Abra a ficha da instituição em /dashboard/instituicoes/[id] e role até o card "Portal de Adesão IES".',
      'Se ainda não tem token, clique no link "→ Gerar convite pelo Portal IES" (leva para /dashboard/ies/novo).',
      'Alternativa: acesse /dashboard/ies diretamente pela URL (não há botão de menu) e clique em "+ Novo convite".',
      '(Opcional) Use o campo "🔍 Buscar IES já cadastrada" para localizar a instituição e pré-preencher os dados.',
      'Preencha: Nome da Instituição*, Razão Social, CNPJ, Tipo (Ensino Superior/Técnico/Médio/Pós-Graduação), Site, Nome do Coordenador, Cargo, E-mail do Convite* (obrigatório), Telefone, Endereço, Cidade, UF.',
      'Clique em "Criar convite e enviar →" — isso gera o link único e tenta enviar e-mail automático para a IES.',
      'Na tela de sucesso, copie o link com o botão "📋 Copiar link" (caso o e-mail automático não tenha sido enviado, é preciso enviar manualmente).',
      'Acompanhe o status em /dashboard/ies (abas "📋 Lista de convites" e "📊 Acompanhamento").',
      'Se precisar reenviar, use o botão "✉️ Enviar por e-mail" dentro da ficha do convite (/dashboard/ies/[id]).',
    ],
    observacoes: [
      "ALERTA IMPORTANTE: usar esse fluxo de convite para uma IES que já existe em /dashboard/instituicoes pode criar um registro duplicado (o formulário de convite sempre cria uma instituição nova, mesmo quando o operador busca e seleciona uma já cadastrada). Avise o usuário dessa possibilidade em vez de garantir que vai vincular automaticamente.",
      "O botão \"✉️ Reenviar convite\" no cabeçalho da ficha do convite NÃO reenvia e-mail — ele abre um novo formulário pré-preenchido (mesmo risco de duplicação). Quem reenvia e-mail de fato é o botão \"✉️ Enviar por e-mail\" dentro do card \"🔗 Link do Portal de Adesão\".",
      "Status possíveis do convênio: PENDENTE (aguardando assinatura) → FIRMADO (assinado) ou AGUARDANDO_MINUTA (IES optou por enviar minuta própria) → CANCELADO (existe no sistema, mas não foi localizado nenhum botão que efetivamente cancele um convênio — não confirmado).",
      "A IES não faz login tradicional — o acesso dela é sempre pelo link/token único gerado nesse fluxo, e depois de assinar, por e-mail + senha (formato SMTR-XXX-XXX) enviada por e-mail.",
      "A IES também pode optar por enviar a minuta própria dela (upload de PDF) em vez de usar a minuta padrão da Smarter — nesse caso o status vira AGUARDANDO_MINUTA e a equipe de convênios trata manualmente.",
      "Os documentos institucionais da Smarter (certidões, CNPJ etc.) que a IES vê no portal dela são cadastrados em Configurações → aba \"Certidões IES\" (franqueadora), não dentro da própria tela de convênio.",
    ],
  },
  {
    area: "CRM (parcerias/vendas de empresas)",
    paraQuem: "Franqueadora, Franqueado, Funcionário/Equipe com permissão \"crm\"",
    rota: "/dashboard/crm",
    passos: [
      'Pipeline de 6 etapas, nesta ordem: "Novo Lead" → "Contatado" → "Reunião Agendada" → "Proposta Enviada" → "Em Negociação" → "Fechado ✓".',
      'Para criar um lead manualmente: clique em "+ Novo Lead" e preencha Empresa* (obrigatório), CNPJ (opcional, autopreenche dados), Contato, Cargo, E-mail, WhatsApp, Cidade, UF, Segmento, Origem, Prioridade → "Criar Lead".',
      'Para mover de etapa: use o <select> no rodapé do card do Kanban, OU dentro da ficha do lead clique num dos botões "→ {etapa}" no card "Etapa do Pipeline". Não é possível arrastar o card.',
      '"Vendido" e "Perdido" não são etapas do funil — são botões separados ("🏆 Vendido" / "✗ Perdido") no cabeçalho da ficha do lead.',
      'Para adicionar uma nota: botão "📝 Nota" → escolher tipo (Anotação/Ligação/Email/Reunião/Whatsapp/Etapa/Alerta) → preencher e "Registrar ✓". Notas e tarefas aparecem juntas, em ordem cronológica, na seção "Timeline" (não existe aba separada de notas).',
      'Para criar uma tarefa: botão "✅ Tarefa" → Descrição, Data, Horário, Link de Reunião → "Criar Tarefa ✓".',
    ],
    observacoes: [
      "Mudar de etapa dispara automaticamente um e-mail comercial ao lead (se ele tiver e-mail e tiver dado opt-in) — isso não é opcional, acontece sempre que a etapa muda.",
      "Existe cálculo automático de SLA por etapa e Lead Score (🔥 Quente / 🌡️ Morno / ❄️ Frio) na ficha do lead.",
    ],
  },
  {
    area: "CRM Franquias — venda de novas unidades (não confundir com o CRM normal)",
    paraQuem: "Exclusivo de Franqueadora",
    rota: "/dashboard/franquia-crm",
    passos: [
      "Este CRM é o funil de VENDA de novas franquias Smarter (candidatos a comprar uma unidade) — não é sobre relacionamento com franquias já existentes.",
      'Pipeline de 6 etapas: "Novo Lead 🆕" → "Primeiro Contato 📞" → "Apresentação do Negócio 🎯" → "Due Diligence 🔍" → "Proposta Financeira 📋" → "Contrato Assinado 🏆".',
      'Criar lead manual: "+ Novo Lead" → Nome completo*, E-mail, WhatsApp, Cidade, Estado, Origem → "Criar Lead".',
      'Importar leads em massa: /dashboard/franquia-crm/importar → botão "📥 Importar CSV" (pensado para exports do Meta Ads, mas aceita outras origens). Detecta leads frios automaticamente (mais de 6 meses).',
    ],
    observacoes: [
      "Franqueado, Funcionário e Equipe NÃO têm acesso nenhum a este módulo — é 100% exclusivo de Franqueadora.",
      "Não confundir com o CRM de parcerias comerciais (item anterior) — são pipelines e telas completamente separados.",
    ],
  },
  {
    area: "Processos Seletivos (Kanban de candidatos)",
    paraQuem: "Franqueadora, Franqueado, Funcionário/Equipe com permissão \"processos\"",
    rota: "/dashboard/processos",
    passos: [
      'Kanban de 5 etapas, nesta ordem: "Inscritos" → "Triagem" → "Entrevista" → "Aprovado ✓" → "Reprovado".',
      'Mover candidatura de etapa: usar o <select> no rodapé do card (não é possível arrastar).',
      'Dentro do card, clicar abre o modal "Candidatura" com abas "📝 Anotações", "📅 Agendamento", "📋 Parecer".',
      'Agendar entrevista: aba "📅 Agendamento" → Data, Horário, Local, Link de Reunião → botão "Salvar ✓".',
      'Gerar parecer em PDF (sem IA, monta o documento no navegador): botão "📄 Gerar Parecer", sempre visível no modal.',
      'Melhorar o texto do parecer com IA: aba "📋 Parecer" → botão "Melhorar parecer com IA".',
      'Existe também um campo separado "Recomendação" (Sem definição / Aprovado / Em análise / Reprovado) — é diferente da etapa do Kanban, precisa salvar separadamente.',
    ],
    observacoes: [
      "Não há envio automático de e-mail/SMS ao candidato quando a entrevista é agendada — o candidato só vê no portal dele; o convite por WhatsApp é sempre manual (o operador clica num botão que abre o WhatsApp com uma mensagem pronta, mas genérica, sem a data/hora).",
      "\"Etapa\" (coluna do Kanban) e \"Recomendação\" (campo dentro do modal) são dois campos diferentes — não confundir ao explicar.",
    ],
  },
  {
    area: "Abrir uma vaga de estágio",
    paraQuem: "Franqueadora, Franqueado, Funcionário (a empresa não cria vaga direto, só solicita)",
    rota: "/dashboard/vagas/nova",
    passos: [
      'Em /dashboard/vagas, clique em "+ Nova Vaga".',
      'Preencha Título*, Função, Área, Nível de Ensino, Empresa* (só lista empresas ATIVAS), Modalidade, Perfil DISC desejado, Descrição, Requisitos, Bolsa*, Aux. Transporte, Benefícios, C.H. Diária, Horário, Dias da Semana, Cidade, UF.',
      'Botões de IA disponíveis: "DISC Ideal", "Gerar descrição com IA", "Sugerir Requisitos", "Sugerir Testes Seletivos" — todos abrem um texto editável que só é aplicado ao campo quando o usuário clica em "✓ Aplicar texto".',
      'Clique em "Publicar Vaga".',
      'A vaga já nasce com um link público de divulgação (botão "🔗 Link de Divulgação" na ficha da vaga).',
    ],
    observacoes: [
      "\"Sugerir Testes Seletivos\" gera um PDF de uso interno da unidade — o texto não aparece na divulgação pública da vaga.",
    ],
  },
  {
    area: "Como a empresa solicita uma vaga (dois fluxos diferentes)",
    paraQuem: "Empresa (do lado dela); Franqueado/Funcionário (do lado de dentro)",
    passos: [
      'Fluxo A (mais completo): a equipe copia o link em "📋 Copiar Link de Solicitação de Vaga" na ficha da empresa → a empresa preenche em /solicitar-vaga?empresa=X sem precisar login → aparece como card "📋 Solicitações de Vaga" na ficha da empresa, com botões "✅ Abrir como Vaga" (converte automaticamente em vaga publicada) ou "❌ Rejeitar".',
      'Fluxo B (portal já logado): a empresa acessa /portal-empresa/solicitar e preenche o formulário → isso só cria uma NOTIFICAÇÃO interna para o franqueado/funcionário, não cria uma solicitação formal nem converte a vaga automaticamente — a equipe precisa ler a notificação e criar a vaga manualmente.',
    ],
    observacoes: [
      "Os dois fluxos não estão integrados entre si — é importante deixar claro qual dos dois a pessoa está usando.",
    ],
  },
  {
    area: "Como o estudante se candidata a uma vaga",
    paraQuem: "Estudante",
    passos: [
      'Lista pública /vagas (sem login) → "Ver Vaga e Candidatar-se →" → página /vaga/{slug}, onde pode fazer login ("Já tenho cadastro") ou se cadastrar na hora ("Quero me cadastrar").',
      'Já logado no portal: /portal-estudante/vagas → botão "Me inscrever" em cada vaga.',
      'Acompanhamento das candidaturas: /portal-estudante/candidaturas, com badge de etapa e % de match.',
    ],
  },
  {
    area: "Cadastro de estudante",
    paraQuem: "Franqueado/Equipe (fluxo interno) ou o próprio estudante (auto-cadastro)",
    passos: [
      'Interno: /dashboard/estudantes → "+ Novo Estudante" → 3 etapas ("1. Dados Pessoais", "2. Acadêmico", "3. Acesso") → "Cadastrar Estudante ✓".',
      'Auto-cadastro público: /cadastro/estudante → 5 etapas ("1. Dados Pessoais", "2. Endereço", "3. Formação", "4. Currículo", "5. Acesso") → "Finalizar Cadastro ✓".',
    ],
    observacoes: [
      "Não existe etapa de aprovação para estudante em nenhum dos dois caminhos — ele já entra ativo (status DISPONIVEL) e recebe acesso ao portal por e-mail.",
      "A instituição de ensino do estudante nunca é criada automaticamente no auto-cadastro — só é vinculada se já existir no cadastro de Instituições.",
    ],
  },
  {
    area: "Cadastro de empresa",
    paraQuem: "Franqueado/Equipe (fluxo interno) ou a própria empresa (auto-cadastro, com aprovação)",
    passos: [
      'Interno: /dashboard/empresas → "+ Nova Empresa" → preencher Dados da Empresa, Responsável, Endereço → "Cadastrar Empresa" (já nasce ATIVA, sem aprovação).',
      'Auto-cadastro público: /cadastro/empresa → 3 etapas → "Enviar Cadastro ✓" (nasce PENDENTE, precisa aprovação).',
      'Aprovar empresa pendente: abrir a ficha da empresa (/dashboard/empresas/[id]) → botão "✓ Aprovar Empresa" → depois "🔑 Criar Acesso ao Portal" para enviar a senha por e-mail.',
    ],
    observacoes: [
      "A empresa não tem tela de auto-edição do próprio cadastro no portal-empresa — quem edita é sempre a equipe da franquia pelo dashboard.",
    ],
  },
  {
    area: "Cadastro de franqueado/franquia",
    paraQuem: "Exclusivo de Franqueadora",
    rota: "/dashboard/franqueados/novo",
    passos: [
      '"+ Novo Franqueado" → preencher Dados da Unidade, Responsável e Acesso (inclui CPF*, E-mail de Contato*), Endereço → "Cadastrar Franqueado".',
      "O sistema envia e-mail de boas-vindas automático com login e senha; se não chegar, existe botão \"Reenviar Boas-Vindas\" na ficha do franqueado.",
    ],
  },
  {
    area: "Marketing Hub",
    paraQuem: "Leitura para todos os papéis com acesso ao módulo; escrita só Franqueadora/Equipe com permissão \"marketing\"",
    rota: "/dashboard/marketing",
    passos: [
      'Sub-abas: "Hub", "Biblioteca", "Campanhas", "Tráfego Pago", "Calendário", "Sugestões IA", "Notícias", e "Admin" (só para quem pode editar).',
      'Biblioteca: consumir materiais — clicar no card abre modal com "Favoritar", "Baixar arquivo", "Abrir link".',
      'Campanhas e Calendário: quem tem permissão de admin cria com "+ Nova campanha" / "+ Novo evento"; os demais só visualizam.',
      'Notícias: admin publica em "Publicar notícia"; todos leem.',
      'Admin (cadastro de conteúdo): botão "Adicionar criativo"/"Adicionar material" → escolher tipo, upload ou URL, descrição, canal, público → "Criar conteúdo".',
    ],
    observacoes: [
      "Tráfego Pago é SOMENTE LEITURA para todo mundo dentro do sistema — as campanhas de Meta/Google Ads que aparecem lá vêm de uma integração externa operada pelo time de Tráfego Pago (ver bloco sobre a Alizo). Não existe botão para o franqueado criar campanha de tráfego pago pelo painel.",
    ],
  },
  {
    area: "Documentos gerados automaticamente do contrato de estágio",
    paraQuem: "Franqueado/Franqueadora/Funcionário com acesso a Contratos",
    rota: "/dashboard/contratos/[id]",
    passos: [
      "Ao criar um contrato, o sistema já deixa prontos para gerar: Termo de Compromisso de Estágio (TCE), Plano de Estágio, Termo Aditivo, Rescisão ao TCE, Recibo de Rescisão, Termo de Recesso Remunerado, Recibo de Pagamento de Bolsa, Termo de Realização de Estágio e Parecer Técnico.",
      'Na ficha do contrato, bloco "📄 Documentos do Estágio": clicar em "Gerar" (ou "Ver" se já gerado) no documento desejado.',
      'Depois de gerado: "⬇ Baixar PDF" (impressão do navegador) ou "✍️ Enviar para Assinatura" (via Autentique).',
      'Depois de assinado: "🔄 Verificar Assinaturas" — quando o TCE é assinado por todos, o contrato é ativado automaticamente.',
      'Downloads rápidos direto na ficha do contrato: "⬇ TCE", "🖨 Imprimir TCE", "⬇ Plano de Estágio", "🧮 Calcular Rescisão".',
    ],
    observacoes: [
      "A Avaliação Semestral não é mais gerada automaticamente com o contrato — é preenchida pela empresa por um link enviado por e-mail (\"📧 Enviar Avaliação por E-mail\" na ficha do contrato).",
      "\"⬇ Baixar PDF\" não é um PDF gerado no servidor — é a impressão do documento HTML pelo navegador do usuário.",
    ],
  },
  {
    area: "Financeiro / cobrança",
    paraQuem: "Franqueadora, Franqueado, Funcionário/Equipe com acesso ao módulo",
    rota: "/dashboard/financeiro",
    passos: [
      'Filtros da tabela: "Mês Atual", "Pendentes", "Pagos", "⚠️ Atrasados", "📅 Futuros", "Cancelados".',
      'Lançar manualmente: "+ Novo Lançamento" → Descrição, Tipo, Valor, Categoria, Status, Vencimento.',
      'Configurar como a unidade recebe: botão "⚙️ Configurar PIX/Boleto" (Chave PIX, Link do Boleto, Instruções).',
      'Só Franqueadora: bloco "🏢 Cobrança de Franquias" — "🏦 Gerar Cobrança + Boleto" avulsa, e "📅 Fechar Mês" (só habilita a partir do dia 23, gera a cobrança de todas as franquias para o mês seguinte).',
    ],
    observacoes: [
      "NÃO confundir \"📅 Fechar Mês\" da tela Financeiro (cobrança de franquias, exclusivo Franqueadora) com \"Mês Atual\" em /dashboard/mes (ferramenta operacional de metas do Franqueado — abrir mês com metas, fechar com relatório comparando real vs. meta). São coisas totalmente diferentes com nomes parecidos.",
      "Bloqueio de acesso por inadimplência (30+ dias) não é automático por padrão — hoje o sistema só detecta e avisa a Franqueadora, não bloqueia ninguém sozinho (depende de uma configuração do ambiente).",
      "\"Assinaturas\" no menu (/dashboard/assinaturas) NÃO é sobre plano pago — é o painel de status de assinatura digital dos documentos de contrato.",
    ],
  },
  {
    area: "Configurações da unidade/franquia",
    paraQuem: "Só Franqueadora edita; os demais só visualizam",
    rota: "/dashboard/configuracoes",
    passos: [
      '8 abas: "Dados da Smarter", "Branding", "Login Visual", "Documentos", "Certidões IES", "Email (Resend)", "Assinatura Digital", "Seguro".',
      '"Certidões IES" é onde se cadastram os documentos institucionais que a IES vê no portal dela (certidões, CNPJ, alvará etc.) — "＋ Adicionar Documento".',
      '"Seguro": Nº da Apólice e Seguradora, usados automaticamente em todos os TCEs gerados.',
    ],
    observacoes: [
      "Onde o franqueado gerencia a EQUIPE e as permissões dos colaboradores é em /dashboard/equipe, não dentro de Configurações.",
    ],
  },
  {
    area: "Equipe (colaboradores e permissões)",
    paraQuem: "Franqueadora (gerencia Equipe Smarter e vê todos) e Franqueado (gerencia só a própria unidade)",
    rota: "/dashboard/equipe",
    passos: [
      '"+ Novo Colaborador" → Nome, E-mail, Cargo, Senha, e marcar os "Módulos com acesso" (cada módulo marcado faz o item aparecer no menu daquele colaborador).',
      'Alterar acesso depois: "✏️ Editar", "🔑 Senha", "⛔"/"✅" (bloquear/reativar), "🗑️" (excluir).',
    ],
  },
];

/**
 * Achados sensíveis que a Lia deve tratar com cautela extra — nunca afirmar com
 * certeza total, sempre no tom de "pelo que sei hoje" quando relevante.
 */
export const PONTOS_NAO_CONFIRMADOS = [
  "Se existe notificação automática (e-mail/SMS) ao agendar uma entrevista de processo seletivo — não foi encontrado no código.",
  "Se o bloqueio automático de acesso por inadimplência está realmente ativo em produção agora — depende de uma configuração do ambiente, não é fixo.",
  "Se os valores de apólice/seguradora usados na tela \"Seguros\" batem com os cadastrados em Configurações → aba \"Seguro\".",
  "Onde exatamente fica o botão de bloqueio manual de uma franquia por inadimplência.",
  "Se enviar um convite de convênio para uma IES já cadastrada de fato reaproveita o cadastro existente ou cria um registro duplicado — trate como risco real, não garanta que funciona sem duplicar.",
];

/** Texto único formatado, pronto para ser injetado no system prompt da Lia. */
export function formatarConhecimentoSistemaParaPrompt(): string {
  const fluxos = FLUXOS_SISTEMA.map((f) => {
    const linhasPassos = f.passos.map((p, i) => `  ${i + 1}. ${p}`).join("\n");
    const linhasObs = f.observacoes?.length
      ? `\n  Observações importantes:\n${f.observacoes.map((o) => `  - ${o}`).join("\n")}`
      : "";
    return `### ${f.area}\nPara quem: ${f.paraQuem}${f.rota ? `\nRota: ${f.rota}` : ""}\nPasso a passo:\n${linhasPassos}${linhasObs}`;
  }).join("\n\n");

  const naoConfirmados = PONTOS_NAO_CONFIRMADOS.map((p) => `- ${p}`).join("\n");

  return `CONHECIMENTO OPERACIONAL DO SISTEMA SMARTER — como cada função da plataforma funciona na prática
Use esta base para responder "como eu faço X" com o passo a passo real, citando os nomes exatos de aba/botão/campo como estão descritos abaixo. Se a pergunta for sobre algo que não está coberto aqui, diga que não tem certeza do detalhe específico e sugira confirmar com o time da Smarter — nunca invente um botão, uma aba ou uma ordem de passos que não está descrita.

${fluxos}

PONTOS QUE A INVESTIGAÇÃO DESTE CONHECIMENTO NÃO CONSEGUIU CONFIRMAR — trate como incerto, não afirme como fato
${naoConfirmados}`;
}
