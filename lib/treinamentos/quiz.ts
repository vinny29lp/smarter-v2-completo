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
