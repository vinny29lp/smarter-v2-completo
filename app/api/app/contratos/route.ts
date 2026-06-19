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

    const [contratos, total] = await Promise.all([
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
    ]);

    return NextResponse.json(
      { contratos, total, page, totalPages: Math.ceil(total / limit) },
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
