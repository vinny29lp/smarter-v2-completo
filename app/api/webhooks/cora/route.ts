/**
 * POST /api/webhooks/cora
 * Recebe notificações de eventos da Cora (INVOICE.PAID, INVOICE.OVERDUE, INVOICE.CANCELLED).
 * Endpoint público — não requer autenticação de sessão.
 * Registrar na Cora via: POST /v1/notifications/endpoints
 *   { "url": "https://sistema.smarterestagios.com.br/api/webhooks/cora",
 *     "events": ["INVOICE.PAID","INVOICE.OVERDUE","INVOICE.CANCELLED"] }
 *
 * SEGURANÇA: o corpo do POST é tratado apenas como GATILHO, nunca como fonte de verdade.
 * Qualquer um pode dar POST aqui; por isso o status real do boleto é confirmado consultando
 * a API da Cora via mTLS (consultarBoleto — mesma função do cron verificar-boletos-cora)
 * antes de alterar qualquer lançamento. Um webhook forjado não muda estado financeiro.
 */
import { prisma } from "@/lib/prisma";
import { consultarBoleto } from "@/lib/cora/boleto";
import { reavaliarBloqueioAposPagamento } from "@/lib/financeiro/bloqueio";
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
    if (!invoiceId || typeof invoiceId !== "string") return NextResponse.json({ ok: true });

    // Busca lançamento pelo coraInvoiceId
    const lancamento = await (prisma.financial as any).findFirst({
      where: { coraInvoiceId: invoiceId },
    });

    if (!lancamento) {
      console.log("[cora-webhook] Invoice não encontrada no DB:", invoiceId);
      return NextResponse.json({ ok: true });
    }

    // Confirma o status direto na Cora (mTLS) — não confia no corpo do webhook.
    let invoice;
    try {
      invoice = await consultarBoleto(invoiceId);
    } catch (e: any) {
      console.error("[cora-webhook] Falha ao confirmar invoice na Cora (evento ignorado):", e.message);
      return NextResponse.json({ ok: true });
    }

    switch (invoice.status) {
      case "PAID": {
        if (lancamento.status !== "PAGO") {
          await prisma.financial.update({
            where: { id: lancamento.id },
            data: {
              status: "PAGO" as any,
              paidAt: new Date(),
            },
          });
          console.log("[cora-webhook] ✅ Confirmado na Cora e marcado como PAGO:", lancamento.id, "R$", lancamento.valor);
          // Pagamento de Taxa de Desenvolvimento pode desfazer bloqueio automático
          if (lancamento.categoria === "Franquia") {
            await reavaliarBloqueioAposPagamento(lancamento.franchiseId);
          }
        }
        break;
      }
      case "CANCELLED": {
        if (!lancamento.cancelado) {
          await (prisma.financial as any).update({
            where: { id: lancamento.id },
            data: {
              cancelado: true,
              coraInvoiceId: null,
              linkPagamento: null,
              chavePix: null,
            },
          });
          console.log("[cora-webhook] Boleto CANCELADO (confirmado na Cora):", lancamento.id);
        }
        break;
      }
      case "LATE": {
        // Apenas log — status permanece PENDENTE até pagamento
        console.log("[cora-webhook] Invoice VENCIDA:", lancamento.id);
        break;
      }
      default:
        console.log("[cora-webhook] Status sem ação:", invoice.status, lancamento.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[cora-webhook] Erro:", e);
    // Retorna 200 mesmo em erro para evitar reenvios infinitos da Cora
    return NextResponse.json({ ok: true });
  }
}
