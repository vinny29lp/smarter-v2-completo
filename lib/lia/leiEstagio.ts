/**
 * leiEstagio.ts — Base de conhecimento estruturada da Lei nº 11.788/2008 (Lei do Estágio)
 *
 * Texto-base fornecido e validado pela operação Smarter, já refletindo as alterações
 * trazidas pela Lei nº 14.913/2024 (artigos 2º, 4º e 9º). Esta é a fonte de verdade
 * usada pela Lia (assistente de IA) — não deve ser reescrita a partir de memória do
 * modelo, apenas referenciada.
 */

export interface ArtigoLei {
  artigo: string;
  titulo: string;
  texto: string;
}

export const DEFINICAO_ESTAGIO = `Estágio é ato educativo escolar supervisionado no ambiente de trabalho, que visa à preparação para o trabalho produtivo de educandos que estejam frequentando o ensino superior, a educação profissional, o ensino médio, a educação especial e os anos finais do ensino fundamental, na modalidade profissional da educação de jovens e adultos (EJA). O estágio faz parte do projeto pedagógico do curso, além de integrar o itinerário formativo do educando.`;

export const ARTIGOS_LEI_11788: ArtigoLei[] = [
  {
    artigo: "Art. 2º",
    titulo: "Estágio obrigatório e não-obrigatório",
    texto: `O estágio pode ser obrigatório (quando a carga horária é requisito para aprovação e obtenção de diploma) ou não-obrigatório (atividade opcional, acrescida à carga horária regular e obrigatória). Atividades de extensão, de monitorias e de iniciação científica na educação superior, desenvolvidas pelo estudante, e o intercâmbio no exterior, quando previstos no projeto pedagógico do curso, também podem ser equiparados a estágio (redação atualizada pela Lei nº 14.913/2024, que acrescentou o intercâmbio no exterior a essa equiparação).`,
  },
  {
    artigo: "Art. 3º",
    titulo: "Ausência de vínculo empregatício — requisitos obrigatórios",
    texto: `O estágio, tanto obrigatório quanto não-obrigatório, NÃO cria vínculo empregatício de qualquer natureza, desde que observados simultaneamente os seguintes requisitos: (I) matrícula e frequência regular do educando, atestadas pela instituição de ensino; (II) celebração de termo de compromisso entre o educando, a parte concedente do estágio e a instituição de ensino; (III) compatibilidade entre as atividades desenvolvidas no estágio e as previstas no termo de compromisso. É exigido acompanhamento efetivo do estágio por um professor orientador da instituição de ensino e por um supervisor da parte concedente. O descumprimento de qualquer um desses requisitos ou de qualquer obrigação contida no termo de compromisso caracteriza vínculo empregatício do educando com a parte concedente do estágio, para todos os fins da legislação trabalhista e previdenciária. Este é o ponto legal mais crítico da lei — é o que gera risco real de passivo trabalhista para a empresa.`,
  },
  {
    artigo: "Art. 4º",
    titulo: "Estudantes elegíveis",
    texto: `Aplica-se aos estudantes estrangeiros regularmente matriculados em instituições de ensino superior no Brasil, e também aos brasileiros ou estrangeiros matriculados em cursos de instituição de ensino superior no exterior, sendo obrigatória a observância do prazo do visto temporário de estudante, quando for o caso (redação atualizada pela Lei nº 14.913/2024, que passou a cobrir também os brasileiros que fazem intercâmbio, além dos estrangeiros que já eram cobertos antes).`,
  },
  {
    artigo: "Art. 5º",
    titulo: "Agentes de integração — papel da Smarter",
    texto: `As instituições de ensino e as partes concedentes de estágio podem, a seu critério, recorrer a serviços de agentes de integração públicos ou privados. É exatamente esse o papel que a Smarter exerce no ecossistema: agente de integração. Cabe aos agentes de integração: identificar oportunidades de estágio; ajustar suas condições de realização; fazer o acompanhamento administrativo; encaminhar negociação de seguro contra acidentes pessoais em favor do estagiário; e cadastrar os estudantes. É EXPRESSAMENTE VEDADO ao agente de integração cobrar qualquer valor dos estudantes por esses serviços. O agente de integração responde civilmente se indicar estagiário para atividades não compatíveis com o curso do educando.`,
  },
  {
    artigo: "Art. 7º",
    titulo: "Obrigações da instituição de ensino",
    texto: `Cabe à instituição de ensino: celebrar termo de compromisso com o educando ou seu representante ou assistente legal, quando ele for absoluta ou relativamente incapaz, e com a parte concedente, indicando as condições de adequação do estágio à proposta pedagógica do curso, à etapa e modalidade da formação escolar e ao horário e calendário escolar; avaliar as instalações da parte concedente e sua adequação à formação cultural e profissional do educando; indicar professor orientador da área a ser desenvolvida no estágio, como responsável pelo acompanhamento e avaliação das atividades do estagiário; exigir do educando a apresentação periódica, em prazo não superior a 6 meses, de relatório das atividades; zelar pelo cumprimento do termo de compromisso, reorientando o estagiário para outro local em caso de descumprimento de suas normas; e comunicar à parte concedente do estágio, no início do período letivo, as datas de realização de avaliações escolares ou acadêmicas.`,
  },
  {
    artigo: "Art. 9º",
    titulo: "Obrigações da parte concedente (empresa)",
    texto: `Cabe às partes concedentes do estágio: celebrar termo de compromisso com a instituição de ensino e o educando, zelando por seu cumprimento; ofertar instalações que tenham condições de proporcionar ao educando atividades de aprendizagem social, profissional e cultural; indicar funcionário de seu quadro de pessoal, com formação ou experiência profissional na área de conhecimento desenvolvida no curso do estagiário, para orientar e supervisionar até 10 estagiários simultaneamente; contratar em favor do estagiário seguro contra acidentes pessoais, cuja apólice seja compatível com valores de mercado — no caso de estágio obrigatório, essa contratação do seguro pode, alternativamente, ficar a cargo da instituição de ensino (regra incluída pela Lei nº 14.913/2024); entregar termo de realização do estágio, com indicação resumida das atividades desenvolvidas, dos períodos e da avaliação de desempenho, no momento do desligamento do estagiário; manter à disposição da fiscalização os documentos comprobatórios do cumprimento da lei; e enviar à instituição de ensino, com periodicidade mínima de 6 meses, relatório de atividades, com vista obrigatória ao estagiário. O termo de compromisso também pode ser celebrado com a instituição de ensino superior a que o intercambista esteja vinculado no Brasil, ou com a instituição de ensino onde ocorre o intercâmbio (regra nova trazida pela Lei nº 14.913/2024).`,
  },
  {
    artigo: "Art. 10",
    titulo: "Jornada de estágio",
    texto: `A jornada de atividade em estágio é definida de comum acordo entre a instituição de ensino, a parte concedente e o estagiário (ou seu representante legal), devendo constar do termo de compromisso, sendo compatível com as atividades escolares, e não podendo ultrapassar: (I) 4 horas diárias e 20 horas semanais, no caso de estudantes de educação especial e dos anos finais do ensino fundamental, na modalidade profissional de educação de jovens e adultos; (II) 6 horas diárias e 30 horas semanais, no caso de estudantes do ensino superior, da educação profissional de nível médio e do ensino médio regular. Nos cursos que alternam teoria e prática, nos períodos em que não estão programadas aulas presenciais, o estágio pode ter jornada de até 40 horas semanais, desde que isso esteja previsto no projeto pedagógico do curso e da instituição de ensino. Em período de avaliações (provas escolares/acadêmicas), a carga horária do estágio é reduzida em pelo menos metade.`,
  },
  {
    artigo: "Art. 11",
    titulo: "Duração máxima do estágio",
    texto: `A duração do estágio, na mesma parte concedente, não pode exceder 2 anos, exceto quando se tratar de estagiário com deficiência, caso em que não há limite de duração.`,
  },
  {
    artigo: "Art. 12",
    titulo: "Bolsa e auxílio-transporte",
    texto: `O estagiário poderá receber bolsa ou outra forma de contraprestação que venha a ser acordada, sendo compulsória sua concessão, bem como a do auxílio-transporte, na hipótese de estágio não-obrigatório. No caso de estágio obrigatório, a concessão de bolsa e de auxílio-transporte não é obrigatória por lei (mas podem ser oferecidos pela empresa por liberalidade). A eventual concessão de benefícios relacionados a transporte, alimentação e saúde, entre outros, não caracteriza vínculo empregatício. É facultado ao estudante inscrever-se e contribuir como segurado facultativo do Regime Geral de Previdência Social (INSS).`,
  },
  {
    artigo: "Art. 13",
    titulo: "Recesso",
    texto: `É assegurado ao estagiário, sempre que o estágio tenha duração igual ou superior a 1 ano, período de recesso de 30 dias, a ser gozado preferencialmente durante suas férias escolares. O recesso deve ser remunerado quando o estagiário receber bolsa ou outra forma de contraprestação. Quando o estágio tem duração inferior a 1 ano, o recesso é concedido de forma proporcional.`,
  },
  {
    artigo: "Art. 14",
    titulo: "Saúde e segurança no trabalho",
    texto: `Aplica-se ao estagiário a legislação relacionada à saúde e segurança no trabalho, sendo sua implementação de responsabilidade da parte concedente do estágio.`,
  },
  {
    artigo: "Art. 15",
    titulo: "Penalidade por descumprimento",
    texto: `A manutenção de estagiário fora dos requisitos e condições previstos nesta lei caracteriza vínculo de emprego do educando com a parte concedente do estágio, para todos os fins da legislação trabalhista e previdenciária. A instituição de ensino que reiteradamente descumprir suas obrigações relativas ao estágio fica impedida de, pelo prazo de 2 anos, contados da data da decisão definitiva do processo administrativo, celebrar novos termos de compromisso — sendo essa penalidade limitada à filial ou agência em que ocorreu a irregularidade.`,
  },
  {
    artigo: "Art. 16",
    titulo: "Assinatura do termo de compromisso",
    texto: `O termo de compromisso deve ser assinado pelo estagiário (ou por seu representante ou assistente legal, quando for menor de 18 anos) e pelos representantes legais da parte concedente e da instituição de ensino. Os agentes de integração NÃO podem figurar como representantes de nenhuma das partes no termo de compromisso — seu papel é intermediar, não representar.`,
  },
  {
    artigo: "Art. 17",
    titulo: "Proporção de estagiários por quadro de pessoal",
    texto: `O número máximo de estagiários em relação ao quadro de pessoal das entidades concedentes de estágio deve atender às seguintes proporções: de 1 a 5 empregados: 1 estagiário; de 6 a 10 empregados: até 2 estagiários; de 11 a 25 empregados: até 5 estagiários; acima de 25 empregados: até 20% de estagiários. Havendo fração no cálculo do percentual, arredonda-se para o número inteiro imediatamente superior. ATENÇÃO — pegadinha comum: essa proporção NÃO se aplica a estágio de nível superior e de nível médio profissional; ela só vale para estágio de nível médio (ensino médio regular) e dos anos finais do ensino fundamental na modalidade EJA profissional. Do total de vagas de estágio da parte concedente, 10% devem ser reservadas a estudantes com deficiência. Quando a parte concedente possuir várias filiais ou órgãos regionais, a proporção é aplicada em cada um dos estabelecimentos separadamente.`,
  },
  {
    artigo: "Art. 18",
    titulo: "Prorrogação de estágios anteriores à lei",
    texto: `A prorrogação de estágios contratados antes da entrada em vigor desta lei somente pode ocorrer se ajustada às suas disposições.`,
  },
];

/**
 * Dúvidas mais comuns na prática — pontos que a Lia deve saber destacar
 * proativamente quando forem relevantes para a pergunta feita, sem precisar
 * que o usuário cite o artigo.
 */
export const PONTOS_PRATICOS_COMUNS = [
  "Diferença entre estágio obrigatório e não-obrigatório quanto a bolsa e auxílio-transporte (art. 12): no não-obrigatório os dois são compulsórios se houver contraprestação; no obrigatório, nenhum dos dois é exigido por lei.",
  "O descumprimento dos requisitos do art. 3º (matrícula/frequência, termo de compromisso, compatibilidade de atividades, supervisão efetiva) gera vínculo empregatício — esse é o risco jurídico real que mais preocupa as empresas.",
  "Limite de 2 anos de estágio na mesma empresa (art. 11), exceto para estagiário com deficiência, que não tem limite.",
  "Proporção de estagiários por porte da empresa (art. 17) e a exceção importante: essa proporção NÃO vale para estágio de nível superior nem de nível médio profissional, só para ensino médio regular/EJA profissional.",
  "O papel da Smarter como agente de integração (art. 5º e 16): não pode cobrar do estudante por seus serviços, e não pode representar nenhuma das partes no termo de compromisso.",
];

/** Texto único formatado, pronto para ser injetado no system prompt da Lia. */
export function formatarBaseLegalParaPrompt(): string {
  const artigos = ARTIGOS_LEI_11788.map(
    (a) => `${a.artigo} — ${a.titulo}\n${a.texto}`
  ).join("\n\n");

  const pontos = PONTOS_PRATICOS_COMUNS.map((p) => `- ${p}`).join("\n");

  return `LEI Nº 11.788/2008 (LEI DO ESTÁGIO) — já com as alterações da Lei nº 14.913/2024 nos artigos 2º, 4º e 9º.

CONCEITO
${DEFINICAO_ESTAGIO}

ARTIGOS
${artigos}

PONTOS PRÁTICOS QUE MERECEM DESTAQUE QUANDO RELEVANTES PARA A PERGUNTA
${pontos}`;
}
