/** GET /api/cron/franquia-contratos — confere no Autentique os contratos de franquia enviados e ativa as unidades assinadas. */
import { NextResponse } from "next/server";
import { verificarContratosPendentes } from "@/lib/franquia/jornada";
import { prisma } from "@/lib/prisma";

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
    const r = await verificarContratosPendentes();
    // Registro de acompanhamento: só quando há contrato pendente ou erro (evita 48 linhas/dia à toa).
    // Prova que o cron rodou e o que ele encontrou.
    if (r.verificados > 0 || r.erros > 0) {
      const detalhe = `Cron franquia-contratos (${isCron ? "agendado" : "manual"}): verificados=${r.verificados} ativados=${r.ativados} erros=${r.erros}`;
      console.log(`[franquia-contratos] ${detalhe}`);
      await prisma.automacaoEnvio.create({ data: { tipo: "CRON_FRANQUIA_CONTRATOS", refId: new Date().toISOString().slice(0, 16), destinatario: "sistema", canal: "interno", detalhe } }).catch(() => {});
    }
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    console.error("[franquia-contratos] erro:", e?.message);
    await prisma.automacaoEnvio.create({ data: { tipo: "CRON_FRANQUIA_CONTRATOS", refId: new Date().toISOString().slice(0, 16), destinatario: "sistema", canal: "interno", detalhe: ("ERRO: " + (e?.message || "desconhecido")).slice(0, 300) } }).catch(() => {});
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
