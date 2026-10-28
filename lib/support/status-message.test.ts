import { describe, expect, it } from "vitest";
import { supportStatusMessage } from "./status-message";

describe("supportStatusMessage", () => {
  it("deixa explícito que autorização de reparo é humana", () => {
    const text = supportStatusMessage({ status: "awaiting_authorization", protocol: "SUP-1", resolution: null });
    expect(text).toContain("autorização de uma pessoa responsável");
    expect(text).toContain("Nenhum reparo será executado automaticamente");
  });

  it("entrega a resolução registrada pelo TI", () => {
    expect(supportStatusMessage({ status: "resolved", protocol: "SUP-2", resolution: "Atualize a página e repita a ação." }))
      .toContain("Atualize a página");
  });
});
