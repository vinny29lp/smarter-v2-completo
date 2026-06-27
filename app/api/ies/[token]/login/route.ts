// POST /api/ies/[token]/login — autentica a IES no portal
// Rota PÚBLICA — verifica email + senha gerada após assinatura do convênio

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const { email, senha } = await req.json();
    if (!email?.trim() || !senha?.trim()) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const institution = await prisma.institution.findUnique({
      where: { token: params.token },
      select: { id: true, name: true, convenioStatus: true, assinanteEmail: true, portalSenha: true },
    });

    if (!institution) {
      return NextResponse.json({ error: "Link inválido." }, { status: 404 });
    }
    if (institution.convenioStatus !== "FIRMADO") {
      return NextResponse.json({ error: "O convênio desta instituição ainda não foi firmado." }, { status: 403 });
    }

    const emailOk = institution.assinanteEmail?.toLowerCase() === email.trim().toLowerCase();
    const senhaOk = institution.portalSenha
      ? await bcrypt.compare(senha.trim(), institution.portalSenha)
      : false;

    if (!emailOk || !senhaOk) {
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    return NextResponse.json({ ok: true, nomeIES: institution.name });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
