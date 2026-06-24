/**
 * Cora Bank API — mTLS + OAuth 2.0 client (Integração Direta)
 * Base URL: https://matls-clients.api.cora.com.br
 *
 * Fluxo:
 *   1. POST /auth/v1/identity/token (mTLS) → access_token
 *   2. Chamar endpoints com Authorization: Bearer {token}
 *
 * Env vars:
 *   CORA_CLIENT_ID       — ex: int-65d7cQEm2h3GPnfjNnMaKE
 *   CORA_CERTIFICATE     — conteúdo do certificate.pem
 *   CORA_PRIVATE_KEY     — conteúdo do privatekey.key
 */

import https from "https";
import { randomUUID } from "crypto";

const CORA_HOSTNAME = "matls-clients.api.cora.com.br";

// Cache do token em memória (válido por instância serverless)
let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

function getCert(): string {
  return (process.env.CORA_CERTIFICATE || "").replace(/\\n/g, "\n");
}

function getKey(): string {
  return (process.env.CORA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function makeAgent(): https.Agent {
  return new https.Agent({
    cert: getCert(),
    key: getKey(),
    rejectUnauthorized: true,
    keepAlive: false,
  });
}

/** Faz uma requisição HTTPS raw com mTLS */
function httpsRequest(options: https.RequestOptions, bodyStr?: string): Promise<{ status: number; raw: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request({ ...options, agent: makeAgent(), timeout: 15000 }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, raw }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Cora: timeout")); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/** Obtém (ou retorna do cache) um access_token OAuth via mTLS */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiresAt) return _cachedToken;

  const clientId = process.env.CORA_CLIENT_ID!;
  const formBody = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}`;

  const { status, raw } = await httpsRequest({
    hostname: CORA_HOSTNAME,
    path: "/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": String(Buffer.byteLength(formBody)),
    },
  }, formBody);

  let data: any;
  try { data = JSON.parse(raw); } catch { data = {}; }

  if (status !== 200 || !data.access_token) {
    throw new Error(`Cora OAuth ${status}: ${data.message || data.error || raw.substring(0, 200)}`);
  }

  _cachedToken = data.access_token as string;
  // Expira 60s antes do prazo para evitar race condition
  _tokenExpiresAt = now + ((data.expires_in ?? 900) - 60) * 1000;
  return _cachedToken;
}

export async function coraRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const clientId = process.env.CORA_CLIENT_ID;
  if (!clientId || !getCert() || !getKey()) {
    throw new Error("Cora: variáveis CORA_CLIENT_ID, CORA_CERTIFICATE e CORA_PRIVATE_KEY não configuradas.");
  }

  const token = await getAccessToken();
  const bodyStr = body ? JSON.stringify(body) : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "client-id": clientId,
    "Idempotency-Key": idempotencyKey || randomUUID(),
  };
  if (bodyStr) {
    headers["Content-Length"] = String(Buffer.byteLength(bodyStr));
  }

  const { status, raw } = await httpsRequest(
    { hostname: CORA_HOSTNAME, path, method, headers },
    bodyStr || undefined,
  );

  if (status === 204) return {} as T;

  let data: T;
  try {
    data = JSON.parse(raw || "{}");
  } catch {
    throw new Error(`Cora: resposta inválida (${status}): ${raw.substring(0, 200)}`);
  }

  if (status >= 400) {
    // Log completo para diagnóstico
    console.error(`[cora] ${method} ${path} → ${status}`);
    console.error(`[cora] payload enviado: ${bodyStr?.substring(0, 500)}`);
    console.error(`[cora] resposta raw: ${raw?.substring(0, 800)}`);
    const errMsg = (data as any)?.message
      || (data as any)?.error_description
      || (data as any)?.errors?.[0]?.message
      || (data as any)?.violations?.[0]?.message
      || raw.substring(0, 500)
      || "(sem detalhes)";
    const err = Object.assign(new Error(`Cora API ${status}: ${errMsg}`), { status, body: data });
    throw err;
  }

  return data;
}
