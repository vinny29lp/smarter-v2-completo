/** GET /api/cron/franquia-contratos — confere no Autentique os contratos de franquia enviados e ativa as unidades assinadas. */
import { NextResponse } from "next/server";
import { verificarContratosPendentes } from "@/lib/franquia/jornada";

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
  try { return NextResponse.json({ ok: true, ...(await verificarContratosPendentes()) }); }
  catch (e: any) { console.error("[franquia-contratos]", e?.message); return NextResponse.json({ error: "Falha" }, { status: 500 }); }
}
