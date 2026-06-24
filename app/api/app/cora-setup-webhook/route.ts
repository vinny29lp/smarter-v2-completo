/**
 * GET /api/app/cora-setup-webhook
 * Registra o webhook do sistema na Cora. Chamar UMA VEZ após as credenciais estarem configuradas.
 * Apenas FRANQUEADORA.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { registrarWebhookCora } from "@/lib/cora/boleto";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const webhookUrl = "https://sistema.smarterestagios.com.br/api/webhooks/cora";

  try {
    const result = await registrarWebhookCora(webhookUrl);
    console.log("[cora-setup-webhook] Webhook registrado:", result);
    return NextResponse.json({ ok: true, webhookUrl, result });
  } catch (e: any) {
    console.error("[cora-setup-webhook] Erro:", e);
    return NextResponse.json({ ok: false, error: e.message, body: e.body }, { status: 500 });
  }
}
