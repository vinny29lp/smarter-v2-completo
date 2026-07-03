/**
 * POST /api/app/sessao/ping
 * Chamado a cada 5 minutos pelo frontend enquanto o usuário está com o sistema
 * aberto — fecha a sessão de rastreamento de horas atual (UserSessionLog) e
 * abre uma nova, para manter o relógio rodando sem sessões infinitas abertas.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const franchiseId = session.user.franchiseId ?? null;
    const now = new Date();

    const sessaoAberta = await prisma.userSessionLog.findFirst({
      where: { userId, fim: null },
      orderBy: { inicio: "desc" },
    });

    if (sessaoAberta) {
      const duracaoMin = Math.max(0, Math.round((now.getTime() - sessaoAberta.inicio.getTime()) / 60000));
      await prisma.userSessionLog.update({
        where: { id: sessaoAberta.id },
        data: { fim: now, duracaoMin },
      });
    }

    await prisma.userSessionLog.create({
      data: { userId, franchiseId, inicio: now },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "SESSAO_PING_POST");
  }
}
