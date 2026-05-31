import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const vacancyId = searchParams.get("vacancyId");

  const baseWhere = session?.user?.franchiseId ? { vacancy: { franchiseId: session.user.franchiseId } } : {};
  const where = vacancyId ? { ...baseWhere, vacancyId } : baseWhere;

  const candidaturas = await prisma.application.findMany({
    where,
    include: {
      student: { include: { user: true, institution: true } },
      vacancy: { include: { company: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return NextResponse.json({ candidaturas });
}
