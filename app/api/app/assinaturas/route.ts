import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = session.user.franchiseId
    ? { contract: { franchiseId: session.user.franchiseId } }
    : {};

  const docs = await prisma.internshipDocument.findMany({
    where: { ...where, status: { not: "NAO_GERADO" as any } },
    include: {
      contract: { include: { student: true, company: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ docs });
}
