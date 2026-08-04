import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { logAudit, getClientIP } from "@/lib/audit";
import { mesAtual } from "@/lib/mes/status";
import { mesAnteriorDe, precisaFecharMesAnterior } from "@/lib/mes/gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const franchiseId = session.user.franchiseId;
    if (!franchiseId || session.user.role === "FRANQUEADORA") {
      return NextResponse.json({ error: "Este recurso é exclusivo de unidades franqueadas." }, { status: 403 });
    }

    const { mes, ano } = mesAtual();

    const jaAberto = await prisma.monthOpening.findUnique({
      where: { franchiseId_mes_ano: { franchiseId, mes, ano } },
    });
    if (jaAberto) {
      return NextResponse.json({ error: "O mês atual já foi aberto." }, { status: 409 });
    }

    // Valida que o fechamento do mês anterior existe. Usa mesAnteriorDe() para
    // tratar corretamente a virada de ano (janeiro → dezembro do ano anterior);
    // a checagem antiga só rodava quando mes > 1 e por isso nunca cobria dezembro.
    const mesAnterior = mesAnteriorDe(mes, ano);
    const aberturaAnterior = await prisma.monthOpening.findUnique({
      where: { franchiseId_mes_ano: { franchiseId, mes: mesAnterior.mes, ano: mesAnterior.ano } },
      include: { fechamento: true },
    });
    if (precisaFecharMesAnterior({ existe: !!aberturaAnterior, fechada: !!aberturaAnterior?.fechamento })) {
      return NextResponse.json(
        {
          error: "Você precisa fechar o mês anterior antes de abrir o mês atual.",
          mesAnterior,
        },
        { status: 409 }
      );
    }

    const body = await req.json();
    const toIntOrNull = (v: unknown) => (v === undefined || v === null || v === "" ? null : parseInt(String(v)));

    const abertura = await prisma.monthOpening.create({
      data: {
        franchiseId,
        mes,
        ano,
        criadoPor: session.user.id,
        metaEmpresas: toIntOrNull(body.metaEmpresas),
        metaLeads: toIntOrNull(body.metaLeads),
        metaContratos: toIntOrNull(body.metaContratos),
        metaVagas: toIntOrNull(body.metaVagas),
        metaEstudantes: toIntOrNull(body.metaEstudantes),
        contasAPagar: body.contasAPagar ?? undefined,
        observacoes: body.observacoes || null,
      },
    });

    logAudit({
      userId: session.user.id,
      role: session.user.role || "",
      franchiseId,
      acao: "MES_ABERTO",
      modulo: "mes",
      detalhes: `abertura:${abertura.id} | mes:${mes}/${ano}`,
      ip: getClientIP(req),
    });

    return NextResponse.json({ abertura }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "MES_ABRIR_POST");
  }
}
