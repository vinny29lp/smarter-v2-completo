import "server-only";

const SUPPORT_CASES_URL = "https://www.alizoai.com/api/integrations/support/cases";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AiWorkforceSupportPayload {
  orgId: string;
  unitId: string | null;
  externalReference: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  category: "bug";
  title: string;
  description: string;
}

export type SupportApiResult =
  | { ok: true; status: 200 | 201; protocol: string; alreadyExisted: boolean }
  | { ok: false; status: number; code: "invalid_data" | "unauthorized" | "not_mapped" | "temporary" | "unexpected"; retryable: boolean; message: string };

function safeProtocol(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  const nested = record.case && typeof record.case === "object" ? record.case as Record<string, unknown> : null;
  const value = record.protocol ?? record.caseNumber ?? record.id
    ?? nested?.protocol ?? nested?.caseNumber ?? nested?.id;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

export async function sendSupportCase(
  payload: AiWorkforceSupportPayload,
  options: { token?: string; fetchImpl?: typeof fetch; maxAttempts?: number } = {},
): Promise<SupportApiResult> {
  const token = options.token ?? process.env.SUPPORT_PARTNER_API_TOKEN;
  if (!token) {
    return { ok: false, status: 401, code: "unauthorized", retryable: false, message: "Integração de suporte não configurada." };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 2, 2));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(SUPPORT_CASES_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      if (attempt < maxAttempts) continue;
      return { ok: false, status: 503, code: "temporary", retryable: true, message: "Serviço de suporte temporariamente indisponível." };
    }

    const body = await readJson(response);
    if (response.status === 200 || response.status === 201) {
      return {
        ok: true,
        status: response.status,
        protocol: safeProtocol(body, payload.externalReference),
        alreadyExisted: response.status === 200,
      };
    }
    if ((response.status === 500 || response.status === 503) && attempt < maxAttempts) continue;
    if (response.status === 400) return { ok: false, status: 400, code: "invalid_data", retryable: false, message: "Os dados do chamado são inválidos." };
    if (response.status === 401) return { ok: false, status: 401, code: "unauthorized", retryable: false, message: "A integração de suporte não está autorizada." };
    if (response.status === 404) return { ok: false, status: 404, code: "not_mapped", retryable: false, message: "Organização ou unidade não mapeada no suporte." };
    if (response.status === 500 || response.status === 503) return { ok: false, status: response.status, code: "temporary", retryable: true, message: "Serviço de suporte temporariamente indisponível." };
    return { ok: false, status: response.status, code: "unexpected", retryable: false, message: "Não foi possível abrir o chamado." };
  }

  return { ok: false, status: 503, code: "temporary", retryable: true, message: "Serviço de suporte temporariamente indisponível." };
}

export function getSupportMapping(franchiseId?: string | null): { orgId: string; unitId: string | null } | null {
  const orgId = process.env.SUPPORT_PARTNER_ORG_ID?.trim();
  if (!orgId || !UUID_RE.test(orgId)) return null;
  if (!franchiseId || franchiseId === "FRANQUEADORA") return { orgId, unitId: null };

  try {
    const map = JSON.parse(process.env.SUPPORT_PARTNER_UNIT_MAP || "{}") as Record<string, unknown>;
    const unitId = map[franchiseId];
    return typeof unitId === "string" && UUID_RE.test(unitId.trim()) ? { orgId, unitId: unitId.trim() } : null;
  } catch {
    return null;
  }
}
