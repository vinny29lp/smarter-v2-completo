/**
 * Autentique API v2 — Integração de assinatura digital
 * Docs: https://docs.autentique.com.br/api
 * Token: env AUTHENTIQUE_API_TOKEN (priority) or SystemConfig.autentiqueToken (fallback DB)
 */

import { getSystemConfig } from "./getConfig";

const AUTENTIQUE_API = "https://api.autentique.com.br/v2/graphql";

export interface AutentiqueSignatario {
  email: string;
  nome?: string;
  /** Padrão: "SIGN" */
  action?: "SIGN" | "APPROVE" | "WITNESS";
}

export interface AutentiqueDocumentoResponse {
  id: string;
  name: string;
  refusable: boolean;
  created_at: string;
  signers: Array<{
    email: string;
    name?: string;
    status?: { name: string };
    link?: { short_link: string };
  }>;
}

async function getToken(): Promise<string> {
  // Priority 1: env var
  if (process.env.AUTHENTIQUE_API_TOKEN) return process.env.AUTHENTIQUE_API_TOKEN;
  // Priority 2: SystemConfig in DB
  const cfg = await getSystemConfig();
  if (cfg?.autentiqueToken) return cfg.autentiqueToken;
  throw new Error("Token Autentique não configurado. Acesse Configurações → Autentique para cadastrar.");
}

/**
 * Envia um documento HTML para assinatura via Autentique.
 * Retorna os dados do documento criado (com links de assinatura por signatário).
 */
export async function enviarParaAutentique(
  titulo: string,
  htmlContent: string,
  signatarios: AutentiqueSignatario[]
): Promise<AutentiqueDocumentoResponse> {
  const token = await getToken();
  if (!signatarios || signatarios.length === 0) throw new Error("Informe ao menos um signatário.");

  // GraphQL mutation
  const query = `
    mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
      createDocument(
        document: $document
        signers: $signers
        file: $file
      ) {
        id
        name
        refusable
        created_at
        signers {
          email
          name
          status { name }
          link { short_link }
        }
      }
    }
  `;

  const variables = {
    document: { name: titulo },
    signers: signatarios.map(s => ({
      email: s.email,
      action: s.action || "SIGN",
      ...(s.nome ? { name: s.nome } : {}),
    })),
    file: null,
  };

  const formData = new FormData();
  formData.append("operations", JSON.stringify({ query, variables }));
  formData.append("map", JSON.stringify({ "0": ["variables.file"] }));
  const htmlBlob = new Blob([htmlContent], { type: "text/html" });
  formData.append("0", htmlBlob, `${titulo.replace(/\s+/g, "-")}.html`);

  const response = await fetch(AUTENTIQUE_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Autentique HTTP ${response.status}: ${text}`);
  }

  const json = await response.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e: any) => e.message).join("; ");
    throw new Error(`Autentique GraphQL error: ${msg}`);
  }

  return json.data.createDocument as AutentiqueDocumentoResponse;
}

/** Verifica se o token está configurado (para UI) */
export async function autentiqueConectado(): Promise<boolean> {
  try {
    const t = await getToken();
    return !!t;
  } catch { return false; }
}
