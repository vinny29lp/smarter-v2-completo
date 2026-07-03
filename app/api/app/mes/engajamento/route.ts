/**
 * GET /api/app/mes/engajamento — FRANQUEADORA (e EQUIPE) apenas.
 * Retorna todas as aberturas/fechamentos de mês da rede para o mês/ano informado,
 * com status de cada unidade (abriu? fechou? score? números principais).
 * Usado na aba de Engajamento (abertura/fechamento) do dashboard.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { mesAtual } from "@/lib/mes/status";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role;
    if (role !== "FRANQUEADORA" && role !== "EQUIPE") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const { mes: mesPadrao, ano: anoPadrao } = mesAtual();
    const mes = searchParams.get("mes") ? parseInt(searchParams.get("mes")!) : mesPadrao;
    const ano = searchParams.get("ano") ? parseInt(searchParams.get("ano")!) : anoPadrao;

    const franquias = await prisma.franchise.findMany({
      where: { status: "ATIVO" },
      select: {
        id: true,
        name: true,
        cidade: true,
        uf: true,
        monthOpenings: {
          where: { mes, ano },
          include: { fechamento: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const rede = franquias.map(f => {
      const abertura = f.monthOpenings[0] ?? null;
      const fechamento = abertura?.fechamento ?? null;
      return {
        franchiseId: f.id,
        nome: f.name,
        cidade: f.cidade,
        uf: f.uf,
        abriu: !!abertura,
        abertoEm: abertura?.criadoEm ?? null,
        fechou: !!fechamento?.leituraConfirmada,
        fechadoEm: fechamento?.leituraConfirmadaEm ?? null,
        score: fechamento?.score ?? null,
        empresasCadastradas: fechamento?.empresasCadastradas ?? null,
        leadsNoMes: fechamento?.leadsNoMes ?? null,
        contratosFirmados: fechamento?.contratosFirmados ?? null,
        horasNoSistema: fechamento?.horasNoSistema ?? null,
      };
    });

    return NextResponse.json({ mes, ano, rede });
  } catch (e) {
    return handleApiError(e, "MES_ENGAJAMENTO_GET");
  }
}
