/**
 * GET /api/cron/vagas-ciclo — vaga aberta 60 dias sem movimento → pausada; pausada +30 dias sem interação → excluída (Lixeira, 90 dias).
 * ?dryRun=true → só mostra o que seria feito. Auth: CRON_SECRET ou FRANQUEADORA logada.
 */
import { NextResponse } from "next/server";
import { rodarCicloVagas } from "@/lib/vagas/cicloExecutor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const isCron = !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
  if (!isCron) {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "true";
  try {
    const r = await rodarCicloVagas({ dryRun });
    console.log("[vagas-ciclo]", JSON.stringify({ dryRun, pausadas: r.pausadas, excluidas: r.excluidas, erros: r.erros }));
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    console.error("[vagas-ciclo] erro:", e?.message);
    return NextResponse.json({ error: "Falha no ciclo de vagas" }, { status: 500 });
  }
}
