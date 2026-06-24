/**
 * Cora Bank — Boleto & PIX helpers
 * Endpoints: /v2/invoices
 */

import { coraRequest } from "./client";
import { randomUUID } from "crypto";

export interface CoraInvoice {
  id: string;
  code: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "OVERDUE";
  amount: number; // centavos
  due_date: string;
  bank_slip?: {
    url: string;
    digitable_line: string;
    our_number: string;
  };
  pix?: {
    qr_code: string;       // copia-e-cola
    qr_code_url?: string;  // link para imagem QR
    qr_code_image?: string; // base64 da imagem
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

  // Ensure vencimento is not in the past
  const hoje = new Date().toISOString().split("T")[0];
  const dueDate = input.vencimento < hoje ? hoje : input.vencimento;

  const payload: Record<string, unknown> = {
    code: input.financialId.replace(/-/g, "").substring(0, 40),
    customer: {
      name: input.nomeCliente.substring(0, 100),
      document: { identity: docClean, type: input.tipoDocumento },
      email: input.email,
    },
    services: [
      {
        name: input.descricao.substring(0, 100),
        amount: amountCents,
        description: input.descricao.substring(0, 255),
      },
    ],
    payment_forms: [{ id: "BANK_SLIP" }, { id: "PIX" }],
    due_date: dueDate,
    // Desabilitamos o envio automático da Cora — o sistema usa Resend com template próprio
    notifications: { send_on_creation: false },
  };

  // Telefone opcional
  if (input.telefone) {
    const tel = input.telefone.replace(/\D/g, "");
    if (tel.length >= 10) {
      (payload.customer as any).phones = [{ type: "COMMERCIAL", number: tel }];
    }
  }

  // Endereço opcional (necessário para boleto registrado completo)
  if (input.cep && input.cidade && input.uf) {
    const cepClean = input.cep.replace(/\D/g, "");
    const streetRaw = input.endereco || "";
    // Tenta separar rua e número
    const match = streetRaw.match(/^(.*?),?\s*n?°?\s*(\d+.{0,20})$/i);
    const street = (match?.[1] || streetRaw).trim().substring(0, 100) || "Não informado";
    const number = (input.numero || match?.[2] || "S/N").trim().substring(0, 10);

    (payload.customer as any).address = {
      street,
      number,
      district: (input.bairro || input.cidade).substring(0, 100),
      city: input.cidade.substring(0, 100),
      state: input.uf.substring(0, 2).toUpperCase(),
      zip_code: cepClean,
      complement: "",
    };
  }

  // Usa UUID fresco para evitar que Cora retorne erro cacheado de tentativas anteriores
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
