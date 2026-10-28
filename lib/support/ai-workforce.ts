import "server-only";

const SUPPORT_CASES_URL = "https://www.alizoai.com/api/integrations/support/cases";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AiWorkforceSupportPayload {
  orgId: string;
  unitId: string | null;
  externalReference: string;
  reporterName: string;
  reporterEmail: string | null;
  reporterPhone: string;
  category: SupportCategory;
  title: string;
  description: string;
  mediaConsent?: true;
  media?: SupportMedia[];
}

export type SupportCategory = "guidance" | "bug" | "access" | "integration" | "billing" | "other";
export type RemoteSupportStatus = "open" | "investigating" | "awaiting_authorization" | "authorized" | "repairing" | "resolved" | "closed";

export interface SupportMedia {
  kind: "image" | "audio";
  mimeType: string;
  base64: string;
  caption: string;
  sourceMessageId: string;
}

export interface RemoteSupportCase {
  id: string;
  protocol: string;
  status: RemoteSupportStatus;
  repairProposal: string | null;
  resolution: string | null;
  updatedAt: string;
  resolvedAt: string | null;
}

export type SupportApiResult =
  | { ok: true; status: 200 | 201; protocol: string; alreadyExisted: boolean; supportCase: RemoteSupportCase | null }
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

function parseRemoteCase(body: unknown): RemoteSupportCase | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const value = root.case && typeof root.case === "object" ? root.case as Record<string, unknown> : root;
  const statuses: RemoteSupportStatus[] = ["open", "investigating", "awaiting_authorization", "authorized", "repairing", "resolved", "closed"];
  if (typeof value.id !== "string" || typeof value.protocol !== "string" || !statuses.includes(value.status as RemoteSupportStatus) || typeof value.updatedAt !== "string") return null;
  return {
    id: value.id,
    protocol: value.protocol,
    status: value.status as RemoteSupportStatus,
    repairProposal: typeof value.repairProposal === "string" ? value.repairProposal : null,
    resolution: typeof value.resolution === "string" ? value.resolution : null,
    updatedAt: value.updatedAt,
    resolvedAt: typeof value.resolvedAt === "string" ? value.resolvedAt : null,
  };
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
        supportCase: parseRemoteCase(body),
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

export async function getSupportCase(
  mapping: { orgId: string },
  externalReference: string,
  options: { token?: string; fetchImpl?: typeof fetch } = {},
): Promise<{ ok: true; supportCase: RemoteSupportCase } | Exclude<SupportApiResult, { ok: true }>> {
  const token = options.token ?? process.env.SUPPORT_PARTNER_API_TOKEN;
  if (!token) return { ok: false, status: 401, code: "unauthorized", retryable: false, message: "Integração de suporte não configurada." };
  const url = new URL(SUPPORT_CASES_URL);
  url.searchParams.set("orgId", mapping.orgId);
  url.searchParams.set("externalReference", externalReference);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const body = await readJson(response);
    if (response.ok) {
      const supportCase = parseRemoteCase(body);
      if (supportCase) return { ok: true, supportCase };
      return { ok: false, status: 502, code: "unexpected", retryable: true, message: "Resposta inválida do serviço de suporte." };
    }
    if (response.status === 400) return { ok: false, status: 400, code: "invalid_data", retryable: false, message: "Consulta de chamado inválida." };
    if (response.status === 401) return { ok: false, status: 401, code: "unauthorized", retryable: false, message: "A integração de suporte não está autorizada." };
    if (response.status === 404) return { ok: false, status: 404, code: "not_mapped", retryable: false, message: "Chamado não encontrado no suporte." };
    if (response.status === 500 || response.status === 503) return { ok: false, status: response.status, code: "temporary", retryable: true, message: "Serviço de suporte temporariamente indisponível." };
    return { ok: false, status: response.status, code: "unexpected", retryable: false, message: "Não foi possível consultar o chamado." };
  } catch {
    return { ok: false, status: 503, code: "temporary", retryable: true, message: "Serviço de suporte temporariamente indisponível." };
  }
}

export function getSupportMapping(franchiseId?: string | null): { orgId: string; unitId: string | null } | null {
  const orgId = process.env.SUPPORT_PARTNER_ORG_ID?.trim();
  if (!orgId || !UUID_RE.test(orgId)) return null;

  try {
    const map = JSON.parse(process.env.SUPPORT_PARTNER_UNIT_MAP || "{}") as Record<string, unknown>;
    const matrixUnitId = map.matrixUnitId;
    if (!franchiseId || franchiseId === "FRANQUEADORA") {
      return typeof matrixUnitId === "string" && UUID_RE.test(matrixUnitId.trim())
        ? { orgId, unitId: matrixUnitId.trim() }
        : { orgId, unitId: null };
    }
    const units = map.units && typeof map.units === "object" ? map.units as Record<string, unknown> : map;
    const unitId = units[franchiseId];
    return typeof unitId === "string" && UUID_RE.test(unitId.trim()) ? { orgId, unitId: unitId.trim() } : null;
  } catch {
    return null;
  }
}
