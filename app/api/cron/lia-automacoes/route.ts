/**
 * GET /api/cron/lia-automacoes
 * Cron diário das automações da Lia (#14 assinaturas, #17 renovação, #19 avaliações).
 * ?dryRun=true → só mostra o que seria enviado, sem enviar nem gravar nada.
 * Kill-switch: LIA_AUTOMACOES_DESLIGADO=true na Vercel desliga tudo sem novo deploy de código.
 * Agendado em vercel.json: 12h UTC = 09h BRT.
 */
import { NextResponse } from "next/server";
import { rodarAutomacoesLia } from "@/lib/automacao/lia";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const isCron = !!cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!isCron) {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (process.env.LIA_AUTOMACOES_DESLIGADO === "true") {
    return NextResponse.json({ ok: true, desligado: true });
  }
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "true";
  try {
    const resultado = await rodarAutomacoesLia({ dryRun });
    console.log("[lia-automacoes]", JSON.stringify({
      dryRun,
      assinaturas: resultado.assinaturas.enviados,
      renovacoes: resultado.renovacoes.enviados,
      avaliacoes: resultado.avaliacoes.enviados,
    }));
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e: any) {
    console.error("[lia-automacoes] erro:", e?.message);
    return NextResponse.json({ error: "Falha nas automações da Lia" }, { status: 500 });
  }
}
