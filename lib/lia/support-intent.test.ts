import { describe, expect, it } from "vitest";
import { extractSupportIntent } from "./support-intent";

describe("extractSupportIntent", () => {
  it("remove o marcador e extrai um encaminhamento válido", () => {
    const result = extractSupportIntent('Vou consultar o TI.\n[[LIA_SUPPORT:{"category":"guidance","title":"Dúvida no filtro","description":"Cliente não encontrou o filtro."}]]');
    expect(result.text).toBe("Vou consultar o TI.");
    expect(result.intent).toEqual({ category: "guidance", title: "Dúvida no filtro", description: "Cliente não encontrou o filtro." });
  });

  it("ignora marcador inválido sem executar encaminhamento", () => {
    const result = extractSupportIntent('Resposta normal [[LIA_SUPPORT:{"category":"repair","title":"x","description":"y"}]]');
    expect(result.intent).toBeNull();
    expect(result.text).toBe("Resposta normal");
  });
});
