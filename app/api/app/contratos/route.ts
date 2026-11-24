import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized", contratos: [] },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const permCheck = checkPermission(session, "contratos");
  if (permCheck) return permCheck;

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip  = (page - 1) * limit;

  try {
    const role = session.user.role;
    const where: any = {};

    if ((role === "FRANQUEADO" || role === "FUNCIONARIO") && session.user.franchiseId) {
      // FRANQUEADO e FUNCIONARIO veem apenas os contratos da sua unidade
      where.franchiseId = session.user.franchiseId;
    } else if (role === "EMPRESA" && session.user.companyId) {
      where.companyId = session.user.companyId;
    }
    // FRANQUEADORA e EQUIPE (franchiseId=undefined) vêem toda a rede

    // Filtro de status no servidor (vale para todas as páginas). Totais por status e total geral
    // ignoram o filtro, para os cartões do topo continuarem mostrando a rede inteira.
    const escopo = { ...where };
    const statusParam = (searchParams.get("status") || "").toUpperCase();
    if (/^[A-Z_]{3,30}$/.test(statusParam)) where.status = statusParam;

    // Busca no servidor (todas as páginas): estudante, empresa, nº do contrato ou unidade.
    const q = (searchParams.get("q") || "").trim().slice(0, 80);
    if (q) {
      const has = { contains: q, mode: "insensitive" as const };
      where.OR = [
        { student: { name: has } },
        { company: { name: has } },
        { numero: has },
        { franchise: { name: has } },
      ];
    }

    const [contratos, total, grupos] = await Promise.all([
      prisma.contract.findMany({
        where,
        select: {
          id: true, numero: true, status: true, tipoEstagio: true, bolsa: true,
          valorEmpresa: true, auxTransporte: true,
          dataInicio: true, dataFim: true, createdAt: true,
          student: { select: { id: true, name: true, email: true, curso: true } },
          company: { select: { id: true, name: true, cnpj: true } },
          institution: { select: { id: true, name: true } },
          franchise: { select: { id: true, name: true } },
          documents: { select: { id: true, status: true } },
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contract.count({ where }),
      // Totais por status de TODAS as páginas (mesmo escopo da listagem), para as métricas do topo.
      prisma.contract.groupBy({ by: ["status"], where: escopo, _count: { _all: true } }),
    ]);
    const totaisPorStatus: Record<string, number> = {};
    for (const g of grupos) totaisPorStatus[g.status || "SEM_STATUS"] = g._count._all;

    return NextResponse.json(
      { contratos, total, totalGeral: Object.values(totaisPorStatus).reduce((a, b) => a + b, 0), totaisPorStatus, page, totalPages: Math.ceil(total / limit) },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (e: any) {
    console.error("[contratos] error:", e?.message || e);
    return NextResponse.json(
      { error: "Erro ao carregar contratos. Tente novamente.", contratos: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
