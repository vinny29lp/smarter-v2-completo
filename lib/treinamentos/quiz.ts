/** Quiz do treinamento inicial. Puro (sem "@/"): testável. A correção é SEMPRE no servidor. */
export const TOTAL_PERGUNTAS = 10;
export const MIN_ACERTOS = 8;

export interface Pergunta { id: string; enunciado: string; opcoes: string[]; correta: number }

export const BANCO: Pergunta[] = [
  { id: "q01", enunciado: "Qual é a regra de ouro da relação entre a equipe digital e você?", opcoes: ["A equipe digital fecha os contratos e você só confere", "A equipe digital abre a porta e você faz o contato humano e fecha", "Você só precisa abrir o sistema uma vez por mês", "A Matriz faz o contato com as empresas por você"], correta: 1 },
  { id: "q02", enunciado: "O que o Victor (Sales) faz?", opcoes: ["Visita as empresas e assina contratos", "Busca empresas na região da unidade, registra no CRM e envia o primeiro e-mail", "Emite boletos aos estudantes", "Atende o suporte técnico"], correta: 1 },
  { id: "q03", enunciado: "Onde o Victor prospecta empresas?", opcoes: ["Em todo o Brasil", "Somente nas regiões de atuação cadastradas para a sua unidade", "Apenas na capital do estado", "Onde o franqueado digitar a cada dia"], correta: 1 },
  { id: "q04", enunciado: "O que significa o aviso “contato humano pendente”?", opcoes: ["A empresa já fechou contrato", "O e-mail falhou e deve ser ignorado", "Uma empresa captada espera o seu contato por WhatsApp ou telefone", "A Lia precisa de ajuda com o e-mail"], correta: 2 },
  { id: "q05", enunciado: "Qual é o objetivo inicial de contratos fechados para a unidade?", opcoes: ["5 contratos", "10 contratos", "30 contratos", "100 contratos"], correta: 2 },
  { id: "q06", enunciado: "Qual é a meta semanal de visitas e apresentações a empresas?", opcoes: ["Pelo menos 2", "Pelo menos 5", "Pelo menos 10", "Nenhuma, só atender quem ligar"], correta: 2 },
  { id: "q07", enunciado: "Por onde você deve começar o dia no sistema?", opcoes: ["Pelo financeiro", "Pela tela Hoje", "Pelas configurações", "Pelo portal do estudante"], correta: 1 },
  { id: "q08", enunciado: "O que a Lia faz?", opcoes: ["Convida estudantes para vagas e avisa renovações, avaliações semestrais e prazos de estágio", "Visita empresas", "Assina contratos pela unidade", "Define as vagas que cada empresa precisa"], correta: 0 },
  { id: "q09", enunciado: "Como a vaga de uma empresa é aberta?", opcoes: ["A empresa envia o levantamento de perfil pelo link gerado na ficha da empresa", "O franqueado cria sem falar com a empresa", "A Matriz abre para todas as unidades", "O estudante pede a vaga"], correta: 0 },
  { id: "q10", enunciado: "Depois do processo seletivo, qual é o próximo passo?", opcoes: ["Esperar a empresa ligar", "Gerar o contrato em Contratos e enviar para assinatura", "Excluir a vaga", "Abrir um novo mês"], correta: 1 },
  { id: "q11", enunciado: "O que acontece se a empresa já estiver cadastrada com o mesmo CNPJ?", opcoes: ["O sistema cadastra de novo", "O sistema bloqueia o CNPJ duplicado e informa onde ela já está", "A empresa é apagada", "Nada, o CNPJ não é verificado"], correta: 1 },
  { id: "q12", enunciado: "Depois de uma visita, o que fazer no mesmo dia?", opcoes: ["Nada, esperar a empresa", "Registrar no CRM e enviar o link de levantamento de perfil por WhatsApp", "Mudar a região da unidade", "Pedir à Lia para visitar"], correta: 1 },
  { id: "q13", enunciado: "Quando o sistema é liberado completamente em uma unidade nova?", opcoes: ["Assim que o contrato é assinado", "Após concluir o treinamento com aprovação no quiz e o assistente da Lia", "Depois de 90 dias", "Quando o primeiro contrato é gerado"], correta: 1 },
  { id: "q14", enunciado: "Se a região de atuação estiver errada, o que você deve fazer?", opcoes: ["Editar sozinho a região do Victor", "Pedir o ajuste à Matriz, que define onde o Victor prospecta", "Esperar o Victor corrigir", "Excluir as empresas do CRM"], correta: 1 },
  { id: "q15", enunciado: "Uma vaga fica 60 dias sem movimento. O que acontece?", opcoes: ["Nada", "Ela é pausada e, após mais 30 dias sem interação, vai para a Lixeira", "É excluída na hora", "Vira contrato"], correta: 1 },
  { id: "q16", enunciado: "Qual lei regula o estágio no Brasil?", opcoes: ["Lei 8.666/1993", "Lei 13.429/2017", "Lei 11.788/2008", "CLT, art. 442"], correta: 2 },
  { id: "q17", enunciado: "Qual é a jornada máxima de um estagiário do ensino superior?", opcoes: ["6 horas por dia e 30 por semana", "4 horas por dia e 20 por semana", "8 horas por dia e 40 por semana", "A empresa define livremente"], correta: 0 },
  { id: "q18", enunciado: "Qual é a duração máxima do estágio na mesma empresa (estagiário sem deficiência)?", opcoes: ["6 meses", "1 ano", "3 anos", "2 anos"], correta: 3 },
  { id: "q19", enunciado: "Quem pode ser cobrado pelo serviço de agenciamento do estágio?", opcoes: ["O estudante, uma taxa de cadastro", "A empresa que contrata. É proibido cobrar do estudante", "A instituição de ensino", "Ninguém pode ser cobrado"], correta: 1 },
  { id: "q20", enunciado: "O que acontece se um requisito legal do estágio é descumprido?", opcoes: ["Nada, a lei só recomenda", "O estudante perde o curso", "Pode caracterizar vínculo de emprego com a empresa", "A franqueadora paga a multa"], correta: 2 },
  { id: "q21", enunciado: "Quem assina o termo de compromisso de estágio (TCE)?", opcoes: ["Somente a empresa", "O franqueado, em nome do estudante", "A Smarter, em nome de todos", "Estudante (ou responsável), empresa e instituição de ensino; o agente de integração não representa as partes"], correta: 3 },
  { id: "q22", enunciado: "No estágio não obrigatório, o que é compulsório?", opcoes: ["Bolsa e auxílio-transporte", "Apenas o seguro", "FGTS e 13º salário", "Plano de saúde"], correta: 0 },
  { id: "q23", enunciado: "Estagiário com 1 ano ou mais de estágio tem direito a quê?", opcoes: ["13º salário", "30 dias de recesso, remunerado quando há bolsa", "FGTS mensal", "Aviso prévio"], correta: 1 },
  { id: "q24", enunciado: "Na ligação, a recepcionista pergunta “sobre o que se trata?”. Qual é a melhor resposta?", opcoes: ["“É um assunto pessoal.”", "“Vendas de produtos.”", "Desligar e não tentar de novo", "“Quero falar sobre gestão de estagiários.”"], correta: 3 },
  { id: "q25", enunciado: "Depois do e-mail do Victor, qual é o seu papel?", opcoes: ["Esperar a empresa responder", "Pedir ao Victor que feche a venda", "Fazer o contato humano no mesmo dia, ligando ou mandando WhatsApp", "Excluir a empresa do CRM"], correta: 2 },
  { id: "q26", enunciado: "Se a base do sistema não tem candidatos na região para uma vaga, o que fazer?", opcoes: ["Captar estudantes na própria região; a Lia indica onde divulgar, com texto pronto", "Cancelar a vaga", "Esperar a Matriz enviar candidatos", "Pedir ao Victor que traga estudantes"], correta: 0 },
  { id: "q27", enunciado: "Qual é a taxa mensal de sistema da unidade e o valor por estagiário ativo?", opcoes: ["R$ 400 e R$ 13", "R$ 250 e R$ 13", "R$ 250 e R$ 25", "R$ 0 de sistema e R$ 13"], correta: 1 },
  { id: "q28", enunciado: "O cliente diz “está caro”. Qual é a melhor primeira resposta?", opcoes: ["Dar desconto na hora", "Encerrar a conversa", "Perguntar “comparado a quê?” e reforçar tudo o que está incluso", "Criticar o concorrente"], correta: 2 },
  { id: "q29", enunciado: "O estagiário universitário pode substituir um funcionário que saiu?", opcoes: ["Sim, se a bolsa estiver em dia", "Sim, por até 3 meses", "Sim, se o estudante concordar", "Não: o estágio é ato educativo e precisa ser compatível com o curso"], correta: 3 },
  { id: "q30", enunciado: "Quando a Lia avisa sobre o ritmo de visitas da unidade?", opcoes: ["Na quinta-feira, para quem está abaixo de 10 visitas na semana", "No fim do mês", "Só quando perde contrato", "Nunca avisa"], correta: 0 },
];

/** Sorteia `n` perguntas distintas. `rand` injetável para teste. */
export function sortearPerguntas(n = TOTAL_PERGUNTAS, rand: () => number = Math.random): Pergunta[] {
  const arr = [...BANCO];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, Math.min(n, arr.length));
}

/** Versão para o cliente: sem a resposta correta. */
export const semGabarito = (p: Pergunta) => ({ id: p.id, enunciado: p.enunciado, opcoes: p.opcoes });

export interface Resposta { id: string; escolha: number }

/** Corrige. Exige exatamente TOTAL_PERGUNTAS ids distintos e válidos; senão devolve null. */
export function corrigir(respostas: unknown): { acertos: number; total: number; aprovado: boolean; erradas: string[] } | null {
  if (!Array.isArray(respostas) || respostas.length !== TOTAL_PERGUNTAS) return null;
  const vistos = new Set<string>();
  let acertos = 0; const erradas: string[] = [];
  for (const r of respostas) {
    const id = String((r as any)?.id ?? ""); const escolha = (r as any)?.escolha;
    const p = BANCO.find(b => b.id === id);
    if (!p || vistos.has(id) || !Number.isInteger(escolha) || escolha < 0 || escolha >= p.opcoes.length) return null;
    vistos.add(id);
    if (escolha === p.correta) acertos++; else erradas.push(id);
  }
  return { acertos, total: TOTAL_PERGUNTAS, aprovado: acertos >= MIN_ACERTOS, erradas };
}
