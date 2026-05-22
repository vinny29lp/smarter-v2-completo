import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewerFranchiseId = (session?.user as any)?.franchiseId;

  const estudante = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true, active: true, lastLoginAt: true } },
      institution: true,
      contracts: {
        where: viewerFranchiseId ? { franchiseId: viewerFranchiseId } : {},
        include: { company: true },
        orderBy: { createdAt: "desc" },
      },
      applications: { include: { vacancy: { include: { company: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!estudante) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ estudante });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const estudante = await prisma.student.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ estudante });
}
