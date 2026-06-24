/**
 * POST /api/webhooks/cora
 * Recebe notificações de eventos da Cora (INVOICE.PAID, INVOICE.OVERDUE, INVOICE.CANCELLED).
 * Endpoint público — não requer autenticação de sessão.
 * Registrar na Cora via: POST /v1/notifications/endpoints
 *   { "url": "https://sistema.smarterestagios.com.br/api/webhooks/cora",
 *     "events": ["INVOICE.PAID","INVOICE.OVERDUE","INVOICE.CANCELLED"] }
 */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface CoraEvent {
  id: string;
  type: string;
  created_at: string;
  data: {
    id: string;         // invoice ID na Cora
    code?: string;      // nosso financial ID
    status?: string;
    paid_at?: string;
    amount?: number;
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as CoraEvent;
    console.log("[cora-webhook] Event:", body.type, body.data?.id);

    const invoiceId = body.data?.id;
    if (!invoiceId) return NextResponse.json({ ok: true });

    // Busca lançamento pelo coraInvoiceId
    const lancamento = await (prisma.financial as any).findFirst({
      where: { coraInvoiceId: invoiceId },
    });

    if (!lancamento) {
      console.log("[cora-webhook] Invoice não encontrada no DB:", invoiceId);
      return NextResponse.json({ ok: true });
    }

    switch (body.type) {
      case "INVOICE.PAID": {
        await prisma.financial.update({
          where: { id: lancamento.id },
          data: {
            status: "PAGO" as any,
            paidAt: body.data.paid_at ? new Date(body.data.paid_at) : new Date(),
          },
        });
        console.log("[cora-webhook] ✅ Marcado como PAGO:", lancamento.id, "R$", lancamento.valor);
        break;
      }
      case "INVOICE.CANCELLED": {
        await (prisma.financial as any).update({
          where: { id: lancamento.id },
          data: {
            cancelado: true,
            coraInvoiceId: null,
            linkPagamento: null,
            chavePix: null,
          },
        });
        console.log("[cora-webhook] Boleto CANCELADO:", lancamento.id);
        break;
      }
      case "INVOICE.OVERDUE": {
        // Apenas log — status permanece PENDENTE até pagamento
        console.log("[cora-webhook] Invoice VENCIDA:", lancamento.id);
        break;
      }
      default:
        console.log("[cora-webhook] Evento não tratado:", body.type);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[cora-webhook] Erro:", e);
    // Retorna 200 mesmo em erro para evitar reenvios infinitos da Cora
    return NextResponse.json({ ok: true });
  }
}
