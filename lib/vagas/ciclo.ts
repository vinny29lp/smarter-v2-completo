/**
 * Ciclo de vida das vagas (regra do negócio):
 *  - vaga ABERTA há 60 dias sem nenhuma movimentação → PAUSADA;
 *  - vaga PAUSADA há mais 30 dias sem nenhuma interação → excluída (vai para a Lixeira por 90 dias, com restauração).
 * "Movimentação/interação" = a vaga ter sido alterada (reaberta, editada) ou ter recebido/movido candidatura.
 * Reabrir ou editar a vaga zera a contagem (updatedAt é renovado).
 */
export const DIAS_PARA_PAUSAR = 60;
export const DIAS_PARA_EXCLUIR = 30;
const DIA = 86_400_000;

export type EstadoVaga = {
  status: string | null;
  /** updatedAt da vaga (renovado ao pausar, reabrir ou editar). */
  atualizadaEm: Date | null;
  criadaEm: Date | null;
  /** Última candidatura criada ou movida de etapa nesta vaga. */
  ultimaCandidaturaEm: Date | null;
};

export type AcaoCiclo = "PAUSAR" | "EXCLUIR" | null;

export function ultimaAtividade(v: EstadoVaga): Date | null {
  const datas = [v.atualizadaEm, v.criadaEm, v.ultimaCandidaturaEm].filter((d): d is Date => !!d);
  if (datas.length === 0) return null;
  return new Date(Math.max(...datas.map(d => d.getTime())));
}

export function decidirCicloVaga(v: EstadoVaga, agora: Date): AcaoCiclo {
  const ultima = ultimaAtividade(v);
  if (!ultima) return null;
  const dias = (agora.getTime() - ultima.getTime()) / DIA;
  if (v.status === "ABERTA" && dias >= DIAS_PARA_PAUSAR) return "PAUSAR";
  if (v.status === "PAUSADA" && dias >= DIAS_PARA_EXCLUIR) return "EXCLUIR";
  return null;
}
