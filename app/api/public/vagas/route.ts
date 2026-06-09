import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const area = searchParams.get("area");
    const cidade = searchParams.get("cidade");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const uf = searchParams.get("uf");

    const where: Record<string, unknown> = { status: "ABERTA" };
    if (area) where.area = { contains: area, mode: "insensitive" };
    if (cidade) where.cidade = { contains: cidade, mode: "insensitive" };
    if (uf) where.uf = { equals: uf.toUpperCase() };

    const vagas = await prisma.vacancy.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titulo: true,
        area: true,
        modalidade: true,
        bolsa: true,
        auxTransporte: true,
        cargaHoraria: true,
        horario: true,
        cidade: true,
        uf: true,
        publicSlug: true,
        createdAt: true,
        company: { select: { name: true, cidade: true, uf: true } },
      },
    });

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    };

    return NextResponse.json({ vagas, total: vagas.length }, { headers });
  } catch (e) {
    console.error("[public/vagas]", e);
    return NextResponse.json({ vagas: [], total: 0 });
  }
}
