/**
 * Autentique API v2 — Integração de assinatura digital
 * Docs: https://docs.autentique.com.br/api
 */

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

/**
 * Envia um documento HTML para assinatura via Autentique.
 * Retorna os dados do documento criado (com links de assinatura por signatário).
 */
export async function enviarParaAutentique(
  titulo: string,
  htmlContent: string,
  signatarios: AutentiqueSignatario[]
): Promise<AutentiqueDocumentoResponse> {
  const token = process.env.AUTHENTIQUE_API_TOKEN;
  if (!token) throw new Error("AUTHENTIQUE_API_TOKEN não configurado nas variáveis de ambiente.");
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
    file: null, // will be substituted by multipart
  };

  // Build multipart/form-data per GraphQL multipart spec
  const formData = new FormData();
  formData.append("operations", JSON.stringify({ query, variables }));
  formData.append("map", JSON.stringify({ "0": ["variables.file"] }));

  // Convert HTML to a Blob file
  const htmlBlob = new Blob([htmlContent], { type: "text/html" });
  formData.append("0", htmlBlob, `${titulo.replace(/\s+/g, "-")}.html`);

  const response = await fetch(AUTENTIQUE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type — fetch sets it with boundary automatically
    },
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
