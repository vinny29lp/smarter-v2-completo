import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const vaga = await prisma.vacancy.findFirst({
    where: { publicSlug: params.slug },
    include: { company: { select: { name: true, cidade: true, uf: true } } },
  });
  if (!vaga) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  return NextResponse.json({ vaga });
}
