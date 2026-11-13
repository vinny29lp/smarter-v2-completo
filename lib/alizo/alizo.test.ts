import { describe, it, expect, vi } from "vitest";
import crypto from "node:crypto";
import { AlizoClient, AlizoError, normalizarTelefone, mascararTelefone } from "./client";
import { verificarAssinaturaAlizo } from "./webhook";

const CHAVE_FALSA = "alz_test_chave_falsa";
const resp = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
const mk = (fn: (...a: any[]) => Promise<Response>) =>
  new AlizoClient({ baseUrl: "https://alizo.test", apiKey: CHAVE_FALSA, fetchImpl: fn as any, sleep: async () => {}, maxTentativas: 3 });

describe("AlizoClient", () => {
  it("envia Bearer e devolve o JSON", async () => {
    const f = vi.fn(async () => resp(200, { units: [{ id: "u1" }] }));
    const r = await mk(f).units();
    expect(r.units[0].id).toBe("u1");
    const [url, init] = f.mock.calls[0] as any;
    expect(url).toBe("https://alizo.test/api/partner/v1/units");
    expect(init.headers.Authorization).toBe(`Bearer ${CHAVE_FALSA}`);
  });
  it.each([401, 403, 404, 409])("não repete em %i e propaga a mensagem pt-BR", async (st) => {
    const f = vi.fn(async () => resp(st, { error: "mensagem em pt-BR" }));
    await expect(mk(f).units()).rejects.toMatchObject({ status: st, message: "mensagem em pt-BR" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("repete em 429/5xx e para quando dá certo", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(resp(429, { error: "limite" }))
      .mockResolvedValueOnce(resp(503, { error: "indisponível" }))
      .mockResolvedValueOnce(resp(200, { units: [] }));
    await expect(mk(f as any).units()).resolves.toEqual({ units: [] });
    expect(f).toHaveBeenCalledTimes(3);
  });
  it("desiste após o máximo de tentativas em 5xx", async () => {
    const f = vi.fn(async () => resp(500, { error: "erro" }));
    await expect(mk(f).units()).rejects.toBeInstanceOf(AlizoError);
    expect(f).toHaveBeenCalledTimes(3);
  });
  it("criarLead normaliza telefone, rejeita inválido e trata duplicate", async () => {
    const f = vi.fn(async () => resp(200, { ok: true, duplicate: true, lead: { id: "l1" } }));
    const c = mk(f);
    const r = await c.criarLead({ unit_id: "u1", name: "Maria", phone: "(11) 99999-0000", first_contact: false });
    expect(r.duplicate).toBe(true);
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).phone).toBe("5511999990000");
    await expect(c.criarLead({ unit_id: "u1", name: "X", phone: "123" })).rejects.toMatchObject({ status: 400 });
  });
  it("enviarMensagem exige Idempotency-Key e envia o header", async () => {
    const f = vi.fn(async () => resp(201, { ok: true, duplicate: false, channels: [] }));
    const c = mk(f);
    await expect(c.enviarMensagem("l1", "oi", "")).rejects.toMatchObject({ status: 400 });
    await c.enviarMensagem("l1", "oi", "t1");
    expect((f.mock.calls[0] as any)[1].headers["Idempotency-Key"]).toBe("t1");
  });
  it("adicionarCandidato exige consentimento", async () => {
    const c = mk(vi.fn(async () => resp(201, {})));
    await expect(c.adicionarCandidato("j1", { name: "João", consent: false as any })).rejects.toMatchObject({ status: 400 });
  });
});

describe("telefone", () => {
  it("normaliza e mascara", () => {
    expect(normalizarTelefone("(21) 97718-8527")).toBe("5521977188527");
    expect(normalizarTelefone("5521977188527")).toBe("5521977188527");
    expect(normalizarTelefone("123")).toBeNull();
    expect(mascararTelefone("5521977188527")).toBe("*********8527");
  });
});

describe("verificarAssinaturaAlizo", () => {
  const segredo = "segredo-de-teste";
  const corpo = JSON.stringify({ id: "e1", type: "lead.message.received" });
  const assinar = (t: number, s = segredo, c = corpo) => `t=${t},v1=${crypto.createHmac("sha256", s).update(`${t}.${c}`).digest("hex")}`;
  const agora = 1_800_000_000_000;
  const t = Math.floor(agora / 1000);

  it("aceita assinatura válida e recente", () => {
    expect(verificarAssinaturaAlizo(corpo, assinar(t), segredo, agora)).toBe(true);
  });
  it("rejeita assinatura inválida, corpo adulterado e segredo errado", () => {
    expect(verificarAssinaturaAlizo(corpo, assinar(t, "outro"), segredo, agora)).toBe(false);
    expect(verificarAssinaturaAlizo(corpo + " ", assinar(t), segredo, agora)).toBe(false);
    expect(verificarAssinaturaAlizo(corpo, "lixo", segredo, agora)).toBe(false);
  });
  it("rejeita replay antigo (> 300 s) e sem segredo", () => {
    expect(verificarAssinaturaAlizo(corpo, assinar(t - 301), segredo, agora)).toBe(false);
    expect(verificarAssinaturaAlizo(corpo, assinar(t), undefined, agora)).toBe(false);
    expect(verificarAssinaturaAlizo(corpo, assinar(t - 299), segredo, agora)).toBe(true);
  });
});
