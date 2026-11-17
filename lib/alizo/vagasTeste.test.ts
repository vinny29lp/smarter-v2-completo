import { describe, it, expect } from "vitest";
import { selecionarVagasTeste } from "./vagasTeste";

describe("selecionarVagasTeste", () => {
  const jobs = [
    { id: "a", title: "[TESTE INTEGRACAO] Estagiário de Direito" },
    { id: "b", title: " suporte  administrativo " },
    { id: "c", title: "Estágio em Marketing" },
    { id: "d", title: "Suporte Administrativo" },
  ];
  it("seleciona só os títulos de teste", () => {
    expect(selecionarVagasTeste(jobs, new Set()).map(j => j.id)).toEqual(["a", "b", "d"]);
  });
  it("nunca seleciona vaga ligada a uma vaga real do Smarter", () => {
    expect(selecionarVagasTeste(jobs, new Set(["d"])).map(j => j.id)).toEqual(["a", "b"]);
  });
  it("ignora itens sem id", () => expect(selecionarVagasTeste([{ title: "Suporte Administrativo" }], new Set())).toEqual([]));
});
