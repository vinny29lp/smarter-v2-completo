import { describe, it, expect } from "vitest";
import { decidirCicloVaga, ultimaAtividade, DIAS_PARA_PAUSAR, DIAS_PARA_EXCLUIR } from "./ciclo";

const agora = new Date("2026-11-21T12:00:00Z");
const diasAtras = (n: number) => new Date(agora.getTime() - n * 86_400_000);
const base = { criadaEm: diasAtras(200), ultimaCandidaturaEm: null as Date | null };

describe("ciclo de vida das vagas", () => {
  it("vaga aberta há 59 dias sem movimentação continua aberta", () => {
    expect(decidirCicloVaga({ ...base, status: "ABERTA", atualizadaEm: diasAtras(59) }, agora)).toBeNull();
  });
  it("vaga aberta há 60 dias sem movimentação é pausada", () => {
    expect(decidirCicloVaga({ ...base, status: "ABERTA", atualizadaEm: diasAtras(DIAS_PARA_PAUSAR) }, agora)).toBe("PAUSAR");
  });
  it("candidatura recente mantém a vaga aberta", () => {
    expect(decidirCicloVaga({ ...base, status: "ABERTA", atualizadaEm: diasAtras(90), ultimaCandidaturaEm: diasAtras(5) }, agora)).toBeNull();
  });
  it("vaga pausada há 29 dias não é excluída", () => {
    expect(decidirCicloVaga({ ...base, status: "PAUSADA", atualizadaEm: diasAtras(29) }, agora)).toBeNull();
  });
  it("vaga pausada há 30 dias sem interação é excluída", () => {
    expect(decidirCicloVaga({ ...base, status: "PAUSADA", atualizadaEm: diasAtras(DIAS_PARA_EXCLUIR) }, agora)).toBe("EXCLUIR");
  });
  it("candidatura nova em vaga pausada impede a exclusão", () => {
    expect(decidirCicloVaga({ ...base, status: "PAUSADA", atualizadaEm: diasAtras(40), ultimaCandidaturaEm: diasAtras(3) }, agora)).toBeNull();
  });
  it("vaga encerrada nunca entra no ciclo", () => {
    expect(decidirCicloVaga({ ...base, status: "ENCERRADA", atualizadaEm: diasAtras(400) }, agora)).toBeNull();
  });
  it("vaga recém-criada e nunca editada conta a partir da criação", () => {
    expect(decidirCicloVaga({ status: "ABERTA", atualizadaEm: null, criadaEm: diasAtras(10), ultimaCandidaturaEm: null }, agora)).toBeNull();
  });
  it("sem nenhuma data não faz nada (não age às cegas)", () => {
    expect(decidirCicloVaga({ status: "ABERTA", atualizadaEm: null, criadaEm: null, ultimaCandidaturaEm: null }, agora)).toBeNull();
    expect(ultimaAtividade({ status: "ABERTA", atualizadaEm: null, criadaEm: null, ultimaCandidaturaEm: null })).toBeNull();
  });
});
