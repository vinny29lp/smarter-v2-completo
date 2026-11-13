/** #18 — Motivo obrigatório (categorizado) na rescisão, para o relatório de causas de saída. */
export const MOTIVOS_RESCISAO = [
  { grupo: "Estudante", valor: "ESTUDANTE_OUTRO_ESTAGIO", rotulo: "Conseguiu outro estágio" },
  { grupo: "Estudante", valor: "ESTUDANTE_EFETIVADO", rotulo: "Foi efetivado(a) / contratado(a)" },
  { grupo: "Estudante", valor: "ESTUDANTE_INSATISFACAO", rotulo: "Insatisfação com o estágio" },
  { grupo: "Estudante", valor: "ESTUDANTE_HORARIO_FACULDADE", rotulo: "Conflito com horário da faculdade" },
  { grupo: "Estudante", valor: "ESTUDANTE_PESSOAL", rotulo: "Motivos pessoais / mudança de cidade" },
  { grupo: "Empresa", valor: "EMPRESA_DESEMPENHO", rotulo: "Desempenho do estagiário" },
  { grupo: "Empresa", valor: "EMPRESA_CORTE", rotulo: "Corte de custos / fim da demanda" },
  { grupo: "Empresa", valor: "EMPRESA_REESTRUTURACAO", rotulo: "Reestruturação / encerrou a vaga" },
  { grupo: "Instituição", valor: "IES_CONCLUSAO", rotulo: "Conclusão do curso" },
  { grupo: "Instituição", valor: "IES_TRANCAMENTO", rotulo: "Trancamento / abandono do curso" },
  { grupo: "Contrato", valor: "TERMINO_NATURAL", rotulo: "Término do prazo do contrato" },
  { grupo: "Contrato", valor: "DISCIPLINAR", rotulo: "Desligamento disciplinar" },
  { grupo: "Outro", valor: "OUTRO", rotulo: "Outro (descreva no campo de observações)" },
] as const;

export const VALORES_MOTIVO = MOTIVOS_RESCISAO.map(m => m.valor) as string[];

export function motivoValido(v: unknown): v is string {
  return typeof v === "string" && VALORES_MOTIVO.includes(v);
}

export function rotuloMotivo(v: string | null | undefined): string {
  if (!v) return "Não informado";
  return MOTIVOS_RESCISAO.find(m => m.valor === v)?.rotulo || "Não informado";
}

export function grupoMotivo(v: string | null | undefined): string {
  return MOTIVOS_RESCISAO.find(m => m.valor === v)?.grupo || "Não informado";
}
