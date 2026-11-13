/**
 * POST /api/alizo/webhook — receptor de eventos da Alizo (assinados com HMAC).
 * Valida assinatura sobre o corpo BRUTO (401 se inválida/replay), deduplica pelo id do evento e responde 200 rápido.
 */
import { NextResponse } from "next/server";
import { verificarAssinaturaAlizo } from "@/lib/alizo/webhook";
import { processarEventoAlizo } from "@/lib/alizo/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function POST(req: Request) {
  const corpo = await req.text();
  const ok = verificarAssinaturaAlizo(corpo, req.headers.get("alizo-signature"), process.env.ALIZO_WEBHOOK_SECRET);
  if (!ok) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });

  let ev: any;
  try { ev = JSON.parse(corpo); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!ev?.id || !ev?.type) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });

  try {
    const r = await processarEventoAlizo({ id: ev.id, type: ev.type, unit_id: ev.unit_id, data: ev.data });
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    console.error("[alizo-webhook] erro:", e?.message);
    // 2xx evita retry inútil; a reconciliação por /events recupera depois.
    return NextResponse.json({ ok: false });
  }
}
