/** GET /api/public/franquia/cof/[token] — registra o download da COF e redireciona para o arquivo (env FRANQUIA_COF_URL). */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { linkValido } from "@/lib/franquia/link";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  // COF versionada no próprio projeto (public/docs); FRANQUIA_COF_URL permite trocar por outro link sem deploy.
  const url = (process.env.FRANQUIA_COF_URL || "").trim() || new URL("/docs/COF_Smarter_Estagios.pdf", _req.url).toString();
  const lead = await prisma.franquiaLead.findUnique({ where: { tokenPublico: params.token }, select: { id: true, linkExpiraEm: true } });
  if (!lead) return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  if (!linkValido(lead.linkExpiraEm)) return NextResponse.json({ error: "Este link expirou. Peça um novo ao seu consultor." }, { status: 410 });
  await prisma.franquiaLead.update({ where: { id: lead.id }, data: { cofBaixadaEm: new Date() } });
  return NextResponse.redirect(url);
}
