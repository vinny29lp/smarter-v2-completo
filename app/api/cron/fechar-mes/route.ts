/**
 * GET /api/cron/fechar-mes
 * Cron mensal — gera as cobranças de Franquia (mensalidade + taxa por estagiário ativo).
 * Também pode ser chamado manualmente pela FRANQUEADORA.
 *
 * Configurado em vercel.json: "0 8 23 * *" (dia 23, 8h UTC = 05h BRT)
 */
import { NextResponse } from "next/server";
import { fecharMes } from "@/lib/financeiro/fechar-mes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Aceita chamada via cron (sem auth) OU via FRANQUEADORA autenticada
  const isCron = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }
  }

  const resultado = await fecharMes(true);
  if ("error" in resultado) {
    return NextResponse.json({ ok: false, error: resultado.error }, { status: resultado.status });
  }

  console.log(`[fechar-mes] ${resultado.message}`);
  return NextResponse.json({ ok: true, resultado });
}
