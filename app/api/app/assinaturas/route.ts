import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "assinaturas");
  if (permCheck) return permCheck;

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip  = (page - 1) * limit;

  const where = session.user.franchiseId
    ? { contract: { franchiseId: session.user.franchiseId } }
    : {};

  const [docs, total] = await Promise.all([
    prisma.internshipDocument.findMany({
      where: { ...where, status: { not: "NAO_GERADO" as any } },
      include: {
        contract: { include: { student: true, company: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.internshipDocument.count({ where: { ...where, status: { not: "NAO_GERADO" as any } } }),
  ]);

  return NextResponse.json({ docs, total, page, totalPages: Math.ceil(total / limit) });
}
