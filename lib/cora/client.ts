/**
 * Cora Bank API — mTLS client (Integração Direta)
 * Base URL produção: https://matls-clients.api.cora.com.br
 *
 * Env vars necessárias:
 *   CORA_CLIENT_ID       — ex: int-65d7cQEm2h3GPnfjNnMaKE
 *   CORA_CERTIFICATE     — conteúdo do certificate.pem (multiline OK)
 *   CORA_PRIVATE_KEY     — conteúdo do privatekey.key (multiline OK)
 */

import https from "https";
import { randomUUID } from "crypto";

const CORA_HOSTNAME = "matls-clients.api.cora.com.br";

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

export async function coraRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const clientId = process.env.CORA_CLIENT_ID;
    if (!clientId || !getCert() || !getKey()) {
      return reject(new Error("Cora: variáveis de ambiente CORA_CLIENT_ID, CORA_CERTIFICATE e CORA_PRIVATE_KEY não configuradas."));
    }

    const bodyStr = body ? JSON.stringify(body) : "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "client-id": clientId,
      "Idempotency-Key": idempotencyKey || randomUUID(),
    };
    if (bodyStr) {
      headers["Content-Length"] = String(Buffer.byteLength(bodyStr));
    }

    const req = https.request(
      {
        hostname: CORA_HOSTNAME,
        path,
        method,
        headers,
        agent: makeAgent(),
        timeout: 15000,
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (status === 204) return resolve({} as T);
          let data: T;
          try {
            data = JSON.parse(raw || "{}");
          } catch {
            return reject(new Error(`Cora: resposta inválida (${status}): ${raw.substring(0, 200)}`));
          }
          if (status >= 400) {
            const errMsg = (data as any)?.message || (data as any)?.errors?.[0]?.message || raw.substring(0, 300);
            const err = Object.assign(new Error(`Cora API ${status}: ${errMsg}`), { status, body: data });
            return reject(err);
          }
          resolve(data);
        });
      },
    );

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Cora: timeout na requisição")); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}
