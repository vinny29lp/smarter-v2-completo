// POST /api/ies/[id]/reenviar-convite — reenvio do email de convite (admin only)

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { enviarConviteIES } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const institution = await prisma.institution.findUnique({ where: { id: params.id } });
  if (!institution) return NextResponse.json({ error: "IES não encontrada." }, { status: 404 });
  if (!institution.email) return NextResponse.json({ error: "IES sem e-mail cadastrado." }, { status: 400 });
  if (!institution.token) return NextResponse.json({ error: "IES sem token de portal." }, { status: 400 });

  const baseUrl = process.env.NEXTAUTH_URL || "https://sistema.smarterestagios.com.br";
  const portalUrl = `${baseUrl}/ies/${institution.token}`;

  // Atualiza data de envio
  await prisma.institution.update({
    where: { id: params.id },
    data: { conviteEnviadoEm: new Date(), conviteEnviadoPor: session.user.id || null },
  });

  const ok = await enviarConviteIES({
    email: institution.email,
    nomeIES: institution.name,
    coordenador: institution.coordenador || undefined,
    portalUrl,
  });

  return NextResponse.json({ ok, portalUrl });
}
