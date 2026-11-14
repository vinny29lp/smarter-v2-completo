/**
 * Central de Ações da Lia — transforma o payload de /api/app/alertas em uma lista
 * priorizada de pendências com ação clara. Função pura (sem imports com "@/")
 * para poder ser testada no vitest.
 */
export type Prioridade = "critico" | "atencao";

export interface TarefaLia {
  id: string;
  prioridade: Prioridade;
  titulo: string;
  detalhe: string;
  acao: string;
  href: string;
  qtd: number;
}

type Lista = any[] | undefined | null;
const arr = (l: Lista) => (Array.isArray(l) ? l : []);

export function montarTarefas(alertas: any, opts: { financeiro?: boolean } = {}): TarefaLia[] {
  if (!alertas) return [];
  const t: TarefaLia[] = [];
  const add = (x: Omit<TarefaLia, "qtd"> & { lista: Lista }) => {
    const qtd = arr(x.lista).length;
    if (qtd > 0) {
      const { lista: _l, ...resto } = x;
      t.push({ ...resto, qtd });
    }
  };

  add({ id: "pend60", prioridade: "critico", lista: alertas.contratosPendentes2Mes,
    titulo: "Contratos sem assinatura há mais de 60 dias",
    detalhe: "Estão parados e podem ser excluídos. Reenvie para assinatura ou cancele.",
    acao: "Resolver contratos", href: "/dashboard/contratos/travados" });
  add({ id: "vencidos", prioridade: "critico", lista: alertas.contratosVencidosSemFinalizar,
    titulo: "Contratos com data de término vencida",
    detalhe: "O estágio terminou e o contrato continua ativo. Finalize ou renove.",
    acao: "Finalizar ou renovar", href: "/dashboard/contratos?status=ATIVO" });
  if (opts.financeiro !== false) {
    add({ id: "gestao", prioridade: "critico", lista: alertas.contratosGestaoSemCobertura,
      titulo: "Contratos ativos sem Taxa de Gestão cobrada",
      detalhe: "Há contratos sem cobrança no mês. Confira no financeiro.",
      acao: "Abrir financeiro", href: "/dashboard/financeiro" });
  }
  add({ id: "vencendo", prioridade: "atencao", lista: alertas.contratosVencendo,
    titulo: "Contratos vencendo nos próximos 30 dias",
    detalhe: "Fale com a empresa e o estudante sobre renovação antes de acabar.",
    acao: "Ver renovações", href: "/dashboard/contratos?status=ATIVO" });
  add({ id: "pend30", prioridade: "atencao", lista: alertas.contratosPendentes1Mes,
    titulo: "Contratos aguardando assinatura há mais de 30 dias",
    detalhe: "Cobre a assinatura antes que passe de 60 dias.",
    acao: "Cobrar assinaturas", href: "/dashboard/contratos/travados" });
  add({ id: "avaliacoes", prioridade: "atencao", lista: alertas.avaliacoesDevidas,
    titulo: "Avaliações semestrais devidas",
    detalhe: "Estágios com mais de 6 meses sem avaliação registrada.",
    acao: "Fazer avaliações", href: "/dashboard/contratos?status=ATIVO" });
  add({ id: "vagas", prioridade: "atencao", lista: alertas.solicitacoesVagaPendentes,
    titulo: "Empresas pediram vaga e aguardam retorno",
    detalhe: "Cada solicitação sem resposta é um possível contrato perdido.",
    acao: "Atender solicitações", href: "/dashboard/vagas" });
  add({ id: "funil", prioridade: "atencao", lista: alertas.candidaturasParadas,
    titulo: "Candidatos parados há mais de 5 dias sem triagem",
    detalhe: "Estudantes inscritos aguardando um retorno. Avance, entreviste ou dispense.",
    acao: "Abrir processos seletivos", href: "/dashboard/processos" });
  add({ id: "crm", prioridade: "atencao", lista: alertas.leadsCrmVencidos,
    titulo: "Leads do CRM com retorno atrasado",
    detalhe: "O retorno combinado passou. Faça o contato hoje.",
    acao: "Abrir CRM", href: "/dashboard/crm" });

  const peso = (p: Prioridade) => (p === "critico" ? 0 : 1);
  return t.sort((a, b) => peso(a.prioridade) - peso(b.prioridade) || b.qtd - a.qtd);
}

export function resumoTarefas(tarefas: TarefaLia[]) {
  return {
    criticas: tarefas.filter(x => x.prioridade === "critico").reduce((s, x) => s + x.qtd, 0),
    atencao: tarefas.filter(x => x.prioridade === "atencao").reduce((s, x) => s + x.qtd, 0),
  };
}

/** Chave estável das pendências: se mudarem, a Lia volta a aparecer mesmo no mesmo dia. */
export function assinaturaTarefas(tarefas: TarefaLia[]): string {
  return tarefas.map(x => `${x.id}:${x.qtd}`).join("|");
}
