/** GET /api/public/franquia/cof/[token] — registra o download da COF e redireciona para o arquivo (env FRANQUIA_COF_URL). */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const url = (process.env.FRANQUIA_COF_URL || "").trim();
  if (!url.startsWith("https://")) return NextResponse.json({ error: "A COF será enviada pelo seu consultor." }, { status: 404 });
  const lead = await prisma.franquiaLead.findUnique({ where: { tokenPublico: params.token }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  await prisma.franquiaLead.update({ where: { id: lead.id }, data: { cofBaixadaEm: new Date() } });
  return NextResponse.redirect(url);
}
