/**
 * GET /api/cron/fechar-mes
 * Cron mensal — gera as cobranças de Franquia (Taxa de Desenvolvimento:
 * mensalidade + taxa por estagiário ativo) e de Empresa (Taxa de Gestão:
 * uma cobrança por contrato ativo com valorEmpresa configurado).
 * Também pode ser chamado manualmente pela FRANQUEADORA.
 *
 * Os dois fechamentos são independentes — se um falhar, o outro ainda roda
 * e o resultado de cada um é reportado separadamente.
 *
 * Configurado em vercel.json: "0 8 23 * *" (dia 23, 8h UTC = 05h BRT)
 */
import { NextResponse } from "next/server";
import { fecharMes } from "@/lib/financeiro/fechar-mes";
import { gerarCobrancasGestaoMensal } from "@/lib/financeiro/cobrancaGestaoMensal";

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

  const franquia = await fecharMes(true).catch((e: any) => ({ error: e?.message || "Erro inesperado", status: 500 as const }));
  if ("error" in franquia) {
    console.error(`[fechar-mes] Franquia falhou: ${franquia.error}`);
  } else {
    console.log(`[fechar-mes] ${franquia.message}`);
  }

  const gestao = await gerarCobrancasGestaoMensal(true).catch((e: any) => ({ error: e?.message || "Erro inesperado", status: 500 as const }));
  if ("error" in gestao) {
    console.error(`[fechar-mes] Taxa de Gestão falhou: ${gestao.error}`);
  } else {
    console.log(`[fechar-mes] ${gestao.message}`);
  }

  return NextResponse.json({ ok: !("error" in franquia) && !("error" in gestao), franquia, gestao });
}
