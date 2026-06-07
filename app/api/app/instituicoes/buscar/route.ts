import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "contratos");
  if (permCheck) return permCheck;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ instituicoes: [] });
  }

  try {
    const instituicoes = await prisma.institution.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { cnpj: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        cnpj: true,
        cidade: true,
        uf: true,
      },
      orderBy: { name: "asc" },
      take: 10,
    });

    return NextResponse.json({ instituicoes });
  } catch (e: any) {
    return NextResponse.json({ error: "Erro na busca.", instituicoes: [] }, { status: 500 });
  }
}
