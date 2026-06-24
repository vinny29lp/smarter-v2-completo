/**
 * Cora Bank — Boleto & PIX helpers
 * Endpoints: /v2/invoices
 * Ref: https://developers.cora.com.br/reference/emissão-de-boleto-registrado-v2
 */

import { coraRequest } from "./client";
import { randomUUID } from "crypto";

export interface CoraInvoice {
  id: string;
  code: string;
  status: "OPEN" | "PAID" | "CANCELLED" | "LATE" | "DRAFT" | "IN_PAYMENT";
  total_amount: number; // centavos
  created_at: string;
  payment_terms?: {
    due_date: string;
  };
  payment_options?: {
    bank_slip?: {
      url: string;           // PDF do boleto
      digitable: string;     // linha digitável
      barcode: string;       // código de barras
      our_number: string;
      registered: string;
    };
  };
  pix?: {
    emv: string;             // copia-e-cola
  };
}

export interface GerarBoletoInput {
  financialId: string;   // usado como idempotency key e code
  nomeCliente: string;
  documento: string;     // CNPJ ou CPF (com ou sem máscara)
  tipoDocumento: "CNPJ" | "CPF";
  email: string;
  telefone?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  valor: number;         // em reais
  descricao: string;
  vencimento: string;    // YYYY-MM-DD
}

export async function gerarBoleto(input: GerarBoletoInput): Promise<CoraInvoice> {
  const amountCents = Math.round(input.valor * 100);
  const docClean = input.documento.replace(/\D/g, "");

  // Vencimento não pode ser anterior a hoje
  const hoje = new Date().toISOString().split("T")[0];
  const dueDate = input.vencimento < hoje ? hoje : input.vencimento;

  // Mínimo de R$5 = 500 centavos
  if (amountCents < 500) {
    throw new Error("Valor mínimo para boleto Cora é R$5,00.");
  }

  // Valida CNPJ (14 dígitos) ou CPF (11 dígitos) antes de enviar
  if (input.tipoDocumento === "CNPJ" && docClean.length !== 14) {
    throw new Error(
      `CNPJ inválido cadastrado na unidade (${docClean.length} dígitos encontrados, esperado 14). ` +
      `Corrija o CNPJ no cadastro da unidade antes de gerar o boleto.`
    );
  }
  if (input.tipoDocumento === "CPF" && docClean.length !== 11) {
    throw new Error(
      `CPF inválido cadastrado na unidade (${docClean.length} dígitos encontrados, esperado 11). ` +
      `Corrija o CPF no cadastro da unidade antes de gerar o boleto.`
    );
  }

  const customer: Record<string, unknown> = {
    name: input.nomeCliente.substring(0, 60),          // máx 60 chars
    document: { identity: docClean, type: input.tipoDocumento },
    email: input.email.substring(0, 60),               // máx 60 chars
  };

  // Endereço opcional — só envia se CEP for válido (8 dígitos brasileiros)
  if (input.cep && input.cidade && input.uf) {
    const cepClean = input.cep.replace(/\D/g, "");
    if (cepClean.length === 8) {
      const streetRaw = input.endereco || "";
      const match = streetRaw.match(/^(.*?),?\s*n?°?\s*(\d+.{0,20})$/i);
      const street = (match?.[1] || streetRaw).trim().substring(0, 60) || "Não informado";
      const number = (input.numero || match?.[2] || "S/N").trim().substring(0, 10);

      customer.address = {
        street,
        number,
        district: (input.bairro || input.cidade).substring(0, 60),
        city: input.cidade.substring(0, 60),
        state: input.uf.substring(0, 2).toUpperCase(),
        zip_code: cepClean,
        complement: "",
      };
    }
    // Se CEP inválido, ignora o endereço (campo é opcional na Cora)
  }

  const payload: Record<string, unknown> = {
    code: input.financialId.replace(/-/g, "").substring(0, 40),
    customer,
    services: [
      {
        name: input.descricao.substring(0, 60),
        amount: amountCents,
        description: input.descricao.substring(0, 100),  // máx 100 chars
      },
    ],
    // due_date vai dentro de payment_terms (não no nível raiz!)
    payment_terms: {
      due_date: dueDate,
    },
    // payment_forms é array de strings (não objetos)
    payment_forms: ["BANK_SLIP", "PIX"],
  };

  // Usa UUID fresco para evitar cache de erros anteriores
  const idempotencyKey = randomUUID();
  console.log("[gerarBoleto] payload:", JSON.stringify(payload));
  return coraRequest<CoraInvoice>("POST", "/v2/invoices", payload, idempotencyKey);
}

export async function consultarBoleto(invoiceId: string): Promise<CoraInvoice> {
  return coraRequest<CoraInvoice>("GET", `/v2/invoices/${invoiceId}`);
}

export async function cancelarBoleto(invoiceId: string): Promise<void> {
  await coraRequest("DELETE", `/v2/invoices/${invoiceId}`);
}

/**
 * Registra o webhook do sistema na Cora.
 * Chamado uma única vez após configurar as credenciais.
 */
export async function registrarWebhookCora(url: string): Promise<unknown> {
  return coraRequest("POST", "/v1/notifications/endpoints", {
    url,
    events: ["INVOICE.PAID", "INVOICE.OVERDUE", "INVOICE.CANCELLED"],
  });
}
