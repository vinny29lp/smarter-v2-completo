import { describe, it, expect, vi } from "vitest";
import { AlizoClient, AlizoError, mensagemAmigavel } from "./client";

const CHAVE = "alz_chave_super_secreta";
const resp = (status: number, corpo: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(corpo), { status, headers });
const mk = (fn: any, sleep = async (_: number) => {}) => new AlizoClient({ baseUrl: "https://alizo.test", apiKey: CHAVE, fetchImpl: fn, sleep, maxTentativas: 3 });

describe("cliente Alizo — operações novas", () => {
  it("respeita Retry-After em 429", async () => {
    const esperas: number[] = [];
    const f = vi.fn().mockResolvedValueOnce(resp(429, { error: "limite" }, { "Retry-After": "3" })).mockResolvedValueOnce(resp(200, { units: [] }));
    await mk(f, async ms => { esperas.push(ms); }).unidadePorExternalId("x");
    expect(esperas).toEqual([3000]);
  });
  it("rotas de WhatsApp, pausa e métricas usam os caminhos e métodos certos", async () => {
    const f = vi.fn(async () => resp(200, {}));
    const c = mk(f);
    await c.whatsappConectar("u1"); await c.whatsappStatus("u1"); await c.pausarLead("l1"); await c.retomarLead("l1");
    await c.desativarUnidade("u1"); await c.reativarUnidade("u1"); await c.metricas("u1", { from: "2026-11-01" }); await c.sincronizarModeloUnidade("u1");
    const chamadas = (f.mock.calls as any[]).map(([u, i]) => `${i.method} ${String(u).replace("https://alizo.test/api/partner/v1", "")}`);
    expect(chamadas).toEqual([
      "POST /units/u1/whatsapp/connect", "GET /units/u1/whatsapp", "POST /leads/l1/pause", "POST /leads/l1/resume",
      "POST /units/u1/deactivate", "POST /units/u1/reactivate", "GET /units/u1/metrics?from=2026-11-01", "POST /units/u1/template/sync",
    ]);
  });
  it("busca de unidade usa external_id (não nome)", async () => {
    const f = vi.fn(async () => resp(200, { units: [] }));
    await mk(f).unidadePorExternalId("abc-123");
    expect(String((f.mock.calls as any[])[0][0])).toContain("/units?external_id=abc-123");
  });
  it("401 não repete e a mensagem amigável não vaza o token", async () => {
    const f = vi.fn(async () => resp(401, { error: `token ${CHAVE} inválido` }));
    const e: any = await mk(f).units().catch(x => x);
    expect(f).toHaveBeenCalledTimes(1);
    expect(e.ehAutenticacao).toBe(true);
    expect(mensagemAmigavel(e)).not.toContain(CHAVE);
  });
  it("mensagens amigáveis por classe de erro", () => {
    expect(mensagemAmigavel(new AlizoError(503, "x"))).toMatch(/indispon/i);
    expect(mensagemAmigavel(new AlizoError(409, "Conflito específico"))).toBe("Conflito específico");
    expect(mensagemAmigavel(new AlizoError(404, "x"))).toMatch(/sincroniza/i);
  });
});
