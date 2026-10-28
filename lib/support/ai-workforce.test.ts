import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getSupportCase, getSupportMapping, sendSupportCase, type AiWorkforceSupportPayload } from "./ai-workforce";

const payload: AiWorkforceSupportPayload = {
  orgId: "11111111-1111-4111-8111-111111111111",
  unitId: "22222222-2222-4222-8222-222222222222",
  externalReference: "smarter-support:33333333-3333-4333-8333-333333333333",
  reporterName: "Usuário Teste",
  reporterEmail: "teste@example.com",
  reporterPhone: "5511999999999",
  category: "bug",
  title: "Erro ao salvar",
  description: "Relato completo",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendSupportCase", () => {
  it("autentica no servidor com Bearer token e envia o contrato esperado", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ protocol: "SUP-123" }), { status: 201 });
    });

    const result = await sendSupportCase(payload, { token: "segredo-servidor", fetchImpl: fetchImpl as typeof fetch });

    expect(result).toEqual({ ok: true, status: 201, protocol: "SUP-123", alreadyExisted: false, supportCase: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((capturedInit?.headers as Record<string, string>).Authorization).toBe("Bearer segredo-servidor");
    expect(JSON.parse(String(capturedInit?.body))).toEqual(payload);
  });

  it("trata HTTP 200 como chamado idempotente já existente", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ case: { protocol: "SUP-EXISTENTE" } }), { status: 200 }));
    const result = await sendSupportCase(payload, { token: "token", fetchImpl: fetchImpl as typeof fetch });
    expect(result).toEqual({ ok: true, status: 200, protocol: "SUP-EXISTENTE", alreadyExisted: true, supportCase: null });
  });

  it("repete falha temporária com a mesma externalReference, sem criar duplicidade", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "temporário" }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ protocol: "SUP-RETRY" }), { status: 200 }));

    const result = await sendSupportCase(payload, { token: "token", fetchImpl: fetchImpl as typeof fetch });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchImpl.mock.calls[1][1]?.body));
    expect(firstBody.externalReference).toBe(payload.externalReference);
    expect(secondBody.externalReference).toBe(payload.externalReference);
  });

  it.each([
    [400, "invalid_data", false],
    [401, "unauthorized", false],
    [404, "not_mapped", false],
    [500, "temporary", true],
    [503, "temporary", true],
  ] as const)("mapeia HTTP %i sem expor resposta interna", async (status, code, retryable) => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "detalhe interno" }), { status }));
    const result = await sendSupportCase(payload, { token: "token-super-secreto", fetchImpl: fetchImpl as typeof fetch, maxAttempts: 1 });
    expect(result).toMatchObject({ ok: false, status, code, retryable });
    expect(JSON.stringify(result)).not.toContain("token-super-secreto");
    expect(JSON.stringify(result)).not.toContain("detalhe interno");
  });

  it("falha de forma segura quando o token server-side não existe", async () => {
    vi.stubEnv("SUPPORT_PARTNER_API_TOKEN", "");
    const fetchImpl = vi.fn();
    const result = await sendSupportCase(payload, { fetchImpl: fetchImpl as typeof fetch });
    expect(result).toMatchObject({ ok: false, status: 401, code: "unauthorized" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("getSupportCase", () => {
  it("consulta por organização e referência com token somente no servidor", async () => {
    let requestedUrl = "";
    let headers: HeadersInit | undefined;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(input);
      headers = init?.headers;
      return new Response(JSON.stringify({
        id: "case-1", protocol: "SUP-1", status: "resolved", repairProposal: null,
        resolution: "Limpe o filtro e tente novamente.", updatedAt: "2026-10-28T12:00:00.000Z", resolvedAt: "2026-10-28T12:00:00.000Z",
      }), { status: 200 });
    });
    const result = await getSupportCase({ orgId: payload.orgId }, payload.externalReference, { token: "segredo", fetchImpl: fetchImpl as typeof fetch });
    expect(result.ok).toBe(true);
    expect(requestedUrl).toContain(`orgId=${payload.orgId}`);
    expect(requestedUrl).toContain("externalReference=smarter-support%3A");
    expect((headers as Record<string, string>).Authorization).toBe("Bearer segredo");
    expect(JSON.stringify(result)).not.toContain("segredo");
  });
});

describe("getSupportMapping", () => {
  it("mapeia organização e unidade sem consultar banco externo", () => {
    vi.stubEnv("SUPPORT_PARTNER_ORG_ID", payload.orgId);
    const matrixUnitId = "44444444-4444-4444-8444-444444444444";
    vi.stubEnv("SUPPORT_PARTNER_UNIT_MAP", JSON.stringify({
      matrixUnitId,
      units: { "franquia-smarter": payload.unitId },
    }));
    expect(getSupportMapping("franquia-smarter")).toEqual({ orgId: payload.orgId, unitId: payload.unitId });
    expect(getSupportMapping("FRANQUEADORA")).toEqual({ orgId: payload.orgId, unitId: matrixUnitId });
    expect(getSupportMapping("nao-mapeada")).toBeNull();
  });

  it("mantém compatibilidade com o mapa plano da fase 1", () => {
    vi.stubEnv("SUPPORT_PARTNER_ORG_ID", payload.orgId);
    vi.stubEnv("SUPPORT_PARTNER_UNIT_MAP", JSON.stringify({ "franquia-smarter": payload.unitId }));
    expect(getSupportMapping("franquia-smarter")).toEqual({ orgId: payload.orgId, unitId: payload.unitId });
  });
});
