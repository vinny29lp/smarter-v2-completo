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
    return NextResponse.json({ estudantes: [] });
  }

  const role = session.user.role;
  const franchiseId = role === "FRANQUEADORA" ? undefined : (session.user.franchiseId || undefined);
  const franchiseWhere = franchiseId ? { franchiseId } : {};

  try {
    const estudantes = await prisma.student.findMany({
      where: {
        ...franchiseWhere,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { cpf:  { contains: q, mode: "insensitive" } },
          { email:{ contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        curso: true,
      },
      orderBy: { name: "asc" },
      take: 10,
    });

    return NextResponse.json({ estudantes });
  } catch (e: any) {
    return NextResponse.json({ error: "Erro na busca.", estudantes: [] }, { status: 500 });
  }
}
