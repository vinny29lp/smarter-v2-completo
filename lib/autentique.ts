/**
 * Autentique API v2 — Integração de assinatura digital
 * Docs: https://docs.autentique.com.br/api
 * Token: env AUTHENTIQUE_API_TOKEN (priority) or SystemConfig.autentiqueToken (fallback DB)
 */

import { getSystemConfig } from "./getConfig";

const AUTENTIQUE_API = "https://api.autentique.com.br/v2/graphql";

/**
 * E-mails internos do Autentique que são adicionados automaticamente como
 * signatários quando um documento é criado via API (dono da conta / sistema).
 * Eles não devem aparecer na interface nem entrar no cálculo de allSigned.
 */
export const AUTENTIQUE_INTERNAL_EMAILS = [
  "assinaturas@smarterestagios.com.br",
];

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
  /** Autentique API v2 retorna `signatures`, não `signers` */
  signatures: Array<{
    public_id?: string;
    email: string;
    name?: string;
    action?: { name: string };
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
        signatures {
          public_id
          email
          name
          action { name }
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

  // CRIT-001: timeout de 20s — evita hang de 30s no Lambda da Vercel se Autentique estiver lento
  const response = await fetch(AUTENTIQUE_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    signal: AbortSignal.timeout(20_000),
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

export interface AutentiqueSignerStatus {
  publicId?: string;
  email: string;
  name?: string;
  action?: string;
  label?: string;
  signed: boolean;
  signedAt?: string;
  rejected: boolean;
  rejectedAt?: string;
  viewed: boolean;
  viewedAt?: string;
  link?: string;
}

export interface AutentiqueDocumentStatus {
  id: string;
  name: string;
  allSigned: boolean;
  signedUrl?: string;
  signers: AutentiqueSignerStatus[];
}

/**
 * Consulta o status de assinaturas de um documento no Autentique.
 */
export async function buscarStatusAutentique(docId: string): Promise<AutentiqueDocumentStatus> {
  const token = await getToken();

  const query = `
    query {
      document(id: "${docId}") {
        id
        name
        files { signed }
        signatures {
          public_id
          email
          name
          action { name }
          link { short_link }
          signed { created_at }
          rejected { created_at }
          viewed { created_at }
        }
      }
    }
  `;

  // CRIT-001: timeout de 15s — consulta de status é mais simples que envio
  const response = await fetch(AUTENTIQUE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(15_000),
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

  const doc = json.data?.document;
  if (!doc) throw new Error("Documento não encontrado no Autentique.");

  const signers: AutentiqueSignerStatus[] = (doc.signatures || [])
    // Excluir e-mails internos do Autentique (dono da conta, adicionados automaticamente)
    .filter((s: any) => !AUTENTIQUE_INTERNAL_EMAILS.includes((s.email || "").toLowerCase()))
    .map((s: any) => ({
      publicId: s.public_id,
      email: s.email,
      name: s.name,
      action: s.action?.name,
      signed: !!s.signed,
      signedAt: s.signed?.created_at || undefined,
      rejected: !!s.rejected,
      rejectedAt: s.rejected?.created_at || undefined,
      viewed: !!s.viewed,
      viewedAt: s.viewed?.created_at || undefined,
      link: s.link?.short_link,
    }));

  const allSigned = signers.length > 0 && signers.every(s => s.signed);

  return {
    id: doc.id,
    name: doc.name,
    allSigned,
    signedUrl: doc.files?.signed || undefined,
    signers,
  };
}

/**
 * Gera (ou re-gera) o link de assinatura de UM signatário específico, pelo
 * `public_id` da assinatura (não confundir com o id do documento).
 *
 * Achado em 2026-08-18: o campo `link.short_link` das queries acima (usado
 * pelo botão "🔗 Copiar link" já existente na tela do documento) só vem
 * preenchido quando o signatário é cadastrado por NOME no Autentique —
 * como sempre cadastramos por e-mail (enviarParaAutentique), esse campo
 * nunca vinha preenchido e o botão nunca aparecia. Esta mutation
 * (`createLinkToSignature`) gera o link sob demanda pra qualquer
 * signatário, independente de como foi cadastrado — é o que a tela usa
 * agora pra "Copiar link" / "Enviar por WhatsApp".
 * Docs: https://docs.autentique.com.br/api/mutations/create-signature-link
 */
export async function criarLinkAssinatura(publicId: string): Promise<string> {
  const token = await getToken();

  const query = `
    mutation {
      createLinkToSignature(public_id: "${publicId}") {
        short_link
      }
    }
  `;

  const response = await fetch(AUTENTIQUE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(15_000),
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

  const shortLink = json.data?.createLinkToSignature?.short_link;
  if (!shortLink) throw new Error("Autentique não retornou o link de assinatura.");
  return shortLink as string;
}
