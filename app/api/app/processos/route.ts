import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "processos");
  if (permCheck) return permCheck;

  const { searchParams } = new URL(req.url);
  const vacancyId = searchParams.get("vacancyId");
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip  = (page - 1) * limit;

  const baseWhere = session?.user?.franchiseId
    ? { vacancy: { franchiseId: session.user.franchiseId } }
    : {};
  const where = vacancyId ? { ...baseWhere, vacancyId } : baseWhere;

  const [candidaturas, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        student: { include: { user: true, institution: true } },
        vacancy: { include: { company: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.application.count({ where }),
  ]);

  return NextResponse.json({ candidaturas, total, page, totalPages: Math.ceil(total / limit) });
}
