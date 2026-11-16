import { describe, it, expect } from "vitest";
import { proximoPassoVaga, canaisDivulgacao, textoDivulgacao } from "./recrutamento";
describe("recrutamento", () => {
  it("próximo passo", () => {
    expect(proximoPassoVaga(0).id).toBe("divulgar");
    expect(proximoPassoVaga(1).id).toBe("aguardar");
    expect(proximoPassoVaga(2).id).toBe("agendar");
  });
  it("canais e texto", () => {
    expect(canaisDivulgacao({ titulo: "Auxiliar", cidade: "Niterói", uf: "RJ" }).length).toBe(5);
    expect(textoDivulgacao({ titulo: "Auxiliar", cidade: "Niterói", bolsa: 1200, link: "https://x/vaga/a" })).toContain("https://x/vaga/a");
  });
});
