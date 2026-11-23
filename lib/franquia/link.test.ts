import { describe, it, expect } from "vitest";
import { novoPrazo, linkValido, LINK_DIAS } from "./link";

describe("prazo do link", () => {
  const agora = new Date("2026-12-01T12:00:00Z");
  it("expira em 30 dias", () => { expect(novoPrazo(agora).toISOString()).toBe("2026-12-31T12:00:00.000Z"); expect(LINK_DIAS).toBe(30); });
  it("válido antes e inválido depois", () => {
    const e = novoPrazo(agora);
    expect(linkValido(e, new Date("2026-12-30T12:00:00Z"))).toBe(true);
    expect(linkValido(e, new Date("2026-12-31T12:00:01Z"))).toBe(false);
  });
  it("sem prazo gravado é válido", () => { expect(linkValido(null, agora)).toBe(true); });
});
