import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "crypto";

beforeAll(() => { process.env.UNIVERSIDADE_SSO_SECRET = "s".repeat(64); });

describe("universidade SSO", () => {
  it("assina o token com HMAC e expira em 2 minutos", async () => {
    const { gerarTokenSso, universidadeConfigurada } = await import("./universidade");
    expect(universidadeConfigurada()).toBe(true);
    const t = gerarTokenSso("Pessoa@Exemplo.com", "Pessoa", 1000);
    const [payload, sig] = t.split(".");
    expect(sig).toBe(createHmac("sha256", "s".repeat(64)).update(payload).digest("hex"));
    const d = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    expect(d.email).toBe("pessoa@exemplo.com");
    expect(d.exp).toBe(1120);
  });
  it("url de entrada leva o token no fragmento (#), não na query", async () => {
    const { urlDeEntrada } = await import("./universidade");
    const u = urlDeEntrada("a@b.com", "A");
    expect(u).toContain("#sso=");
    expect(u.split("#")[0]).not.toContain("sso=");
  });
});
