/**
 * POST /api/webhooks/resend-inbound — recebe o evento `email.received` da Resend (assinado, padrão Svix).
 * Valida a assinatura com RESEND_INBOUND_WEBHOOK_SECRET e entrega à Lia. Responde 200 rápido; erros internos não derrubam o webhook.
 */
import { NextResponse } from "next/server";
import { verificarSvix } from "@/lib/svix";
import { processarRespostaEmail } from "@/lib/lia/responderEmail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const segredo = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (!segredo) return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });

  const corpo = await req.text();
  const ok = verificarSvix({
    id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"),
    assinatura: req.headers.get("svix-signature"), corpo, segredo,
  });
  if (!ok) return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });

  let evento: any;
  try { evento = JSON.parse(corpo); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  if (evento?.type !== "email.received" || !evento?.data?.email_id) return NextResponse.json({ ok: true, ignorado: true });

  try {
    const d = evento.data;
    const r = await processarRespostaEmail({
      emailId: String(d.email_id), messageId: d.message_id ? String(d.message_id) : null,
      from: String(d.from || ""), to: Array.isArray(d.to) ? d.to.map(String) : [String(d.to || "")], subject: d.subject ? String(d.subject) : null,
    });
    return NextResponse.json({ ok: true, motivo: r.motivo });
  } catch (e: any) {
    console.error("[lia-email] erro ao processar:", e?.message);
    return NextResponse.json({ ok: true, erro: true });
  }
}
