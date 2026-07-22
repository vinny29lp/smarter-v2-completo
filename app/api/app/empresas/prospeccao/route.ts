/**
 * POST /api/app/empresas/prospeccao
 * Envia o e-mail de apresentação comercial (aba Empresas) para uma empresa-alvo.
 * Body: { email: string; nomeContato?: string }
 *
 * A unidade de origem vem SEMPRE da sessão (nunca do body) — o link enviado
 * carrega ?ref=<franchiseId> e o lead capturado na landing cai no CRM dessa unidade.
 * FRANQUEADORA envia link sem ref → lead vai para o CRM da franqueadora.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enviarApresentacaoEmpresas } from "@/lib/email";
import { handleApiError } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user?.role || "";
    if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // 20 envios/min por usuário — evita disparo em massa acidental
    const userId = session.user?.id || "anon";
    if (!checkRateLimit(userId, "prospeccao_email", 20, 60_000)) {
      return NextResponse.json(
        { error: "Muitos envios em sequência. Aguarde um minuto e tente novamente." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const nomeContato = body.nomeContato ? String(body.nomeContato).trim().slice(0, 120) : undefined;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    // Unidade de origem: sessão. Sentinel "FRANQUEADORA" = sem unidade (matriz).
    const franchiseId =
      session.user?.franchiseId && session.user.franchiseId !== "FRANQUEADORA"
        ? session.user.franchiseId
        : null;

    let nomeUnidade = "Smarter Estágios";
    let responsavel: string | undefined;
    let cidade: string | undefined;
    let whatsapp: string | null | undefined;

    if (franchiseId) {
      const f = await prisma.franchise.findUnique({
        where: { id: franchiseId },
        select: { name: true, responsavel: true, cidade: true, uf: true, whatsapp: true },
      });
      if (!f) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });
      nomeUnidade = f.name;
      responsavel = f.responsavel;
      cidade = `${f.cidade}/${f.uf}`;
      whatsapp = f.whatsapp;
    }

    const sent = await enviarApresentacaoEmpresas({
      email,
      nomeContato,
      nomeUnidade,
      responsavel,
      cidade,
      whatsapp,
      refId: franchiseId,
    });

    if (!sent) {
      return NextResponse.json({ error: "Falha ao enviar o e-mail. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "EMPRESAS_PROSPECCAO_EMAIL");
  }
}
