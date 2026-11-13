/**
 * GET /api/cron/alizo-sync — importa leads do Google Maps (Alizo) para o CRM e reconcilia eventos perdidos.
 * Auth: CRON_SECRET (Vercel Cron) ou FRANQUEADORA logada.
 */
import { NextResponse } from "next/server";
import { sincronizarAlizo } from "@/lib/alizo/sync";

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
  try {
    return NextResponse.json(await sincronizarAlizo());
  } catch (e: any) {
    console.error("[alizo-sync] erro:", e?.message);
    return NextResponse.json({ error: "Falha na sincronização com a Alizo" }, { status: 500 });
  }
}
