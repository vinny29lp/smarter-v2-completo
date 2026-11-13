import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenOptOutValido } from "@/lib/automacao/token";
import { emailValido, normalizarEmail } from "@/lib/automacao/regras";

export const dynamic = "force-dynamic";

/** Registra o pedido "não quero mais receber" (LGPD). Protegido por token HMAC do e-mail — sem login. */
export async function POST(req: Request) {
  try {
    const { e, t } = await req.json();
    const email = normalizarEmail(e);
    if (!emailValido(email) || !tokenOptOutValido(email, String(t || ""))) {
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
    }
    await prisma.contatoOptOut.upsert({
      where: { email },
      create: { email, motivo: "Pedido pelo link do e-mail" },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar agora. Tente novamente." }, { status: 500 });
  }
}
