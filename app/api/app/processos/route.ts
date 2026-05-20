import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const where = session?.user?.franchiseId ? { vacancy: { franchiseId: session.user.franchiseId } } : {};
  const candidaturas = await prisma.application.findMany({
    where,
    include: {
      student: { include: { user: true, institution: true } },
      vacancy: { include: { company: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ candidaturas });
}
