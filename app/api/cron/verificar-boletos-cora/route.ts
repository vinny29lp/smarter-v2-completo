/**
 * GET /api/cron/verificar-boletos-cora
 * Cron diário — consulta Cora para todos os boletos pendentes e dá baixa nos pagos.
 * Também pode ser chamado manualmente pela FRANQUEADORA.
 *
 * Configurado em vercel.json: "0 10 * * *" (10h00 UTC = 07h00 BRT)
 */
import { prisma } from "@/lib/prisma";
import { consultarBoleto } from "@/lib/cora/boleto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Aceita chamada via cron (sem auth) OU via FRANQUEADORA autenticada
  const cronSecret = process.env.CRON_SECRET;
  const isCron = !!cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!isCron) {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }
  }

  // Busca todos os boletos pendentes com invoice Cora
  const pendentes = await (prisma.financial as any).findMany({
    where: {
      coraInvoiceId: { not: null },
      status: { not: "PAGO" },
      cancelado: false,
    },
    select: { id: true, coraInvoiceId: true, valor: true, descricao: true },
  });

  console.log(`[verificar-boletos-cora] ${pendentes.length} boleto(s) pendente(s) para verificar`);

  let pagos = 0;
  let erros = 0;

  for (const lanc of pendentes) {
    try {
      const invoice = await consultarBoleto(lanc.coraInvoiceId);
      if (invoice.status === "PAID") {
        await (prisma.financial as any).update({
          where: { id: lanc.id },
          data: { status: "PAGO", paidAt: new Date() },
        });
        console.log(`[verificar-boletos-cora] ✅ PAGO: ${lanc.id} — R$${lanc.valor} — ${lanc.descricao}`);
        pagos++;
      }
    } catch (e: any) {
      console.error(`[verificar-boletos-cora] Erro ao verificar ${lanc.coraInvoiceId}:`, e.message);
      erros++;
    }
  }

  return NextResponse.json({
    ok: true,
    verificados: pendentes.length,
    pagos,
    erros,
  });
}
