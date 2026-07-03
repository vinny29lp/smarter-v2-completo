import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { mesAtual } from "@/lib/mes/status";
import { gerarMensagens } from "@/lib/mes/coaching";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mesParam = searchParams.get("mes");
    const anoParam = searchParams.get("ano");
    const { mes: mesPadrao, ano: anoPadrao } = mesAtual();
    const mes = mesParam ? parseInt(mesParam) : mesPadrao;
    const ano = anoParam ? parseInt(anoParam) : anoPadrao;

    // FRANQUEADORA pode consultar o relatório de qualquer unidade via ?franchiseId=
    const role = session.user.role;
    const franchiseIdParam = searchParams.get("franchiseId");
    const franchiseId = role === "FRANQUEADORA"
      ? (franchiseIdParam || undefined)
      : session.user.franchiseId;

    if (!franchiseId) {
      return NextResponse.json({ error: "franchiseId é obrigatório." }, { status: 400 });
    }

    const abertura = await prisma.monthOpening.findUnique({
      where: { franchiseId_mes_ano: { franchiseId, mes, ano } },
      include: { fechamento: true, franchise: { select: { name: true } } },
    });

    if (!abertura || !abertura.fechamento) {
      return NextResponse.json({ error: "Fechamento não encontrado para este mês." }, { status: 404 });
    }

    const mensagens = gerarMensagens(
      {
        empresasCadastradas: abertura.fechamento.empresasCadastradas,
        leadsNoMes: abertura.fechamento.leadsNoMes,
        contratosFirmados: abertura.fechamento.contratosFirmados,
        horasNoSistema: abertura.fechamento.horasNoSistema,
      },
      { metaEmpresas: abertura.metaEmpresas, metaLeads: abertura.metaLeads }
    );

    return NextResponse.json({ abertura, fechamento: abertura.fechamento, mensagens });
  } catch (e) {
    return handleApiError(e, "MES_RELATORIO_GET");
  }
}
