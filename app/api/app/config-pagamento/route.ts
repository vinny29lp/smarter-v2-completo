import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearConfigCache } from "@/lib/getConfig";

const CAMPOS_FRANQUEADORA = ["chavePix","linkPagamento","instrucaoPagamento","qrCodePixUrl","mensagemCobrancaFranqueado"] as const;
const CAMPOS_FRANQUEADO   = ["chavePix","linkPagamento","instrucaoPagamento"] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ config: null });

  // FRANQUEADORA usa SystemConfig
  if (session.user.role === "FRANQUEADORA") {
    const cfg = await prisma.systemConfig.findUnique({
      where: { id: "default" },
      select: { chavePix: true, linkPagamento: true, instrucaoPagamento: true, qrCodePixUrl: true, mensagemCobrancaFranqueado: true },
    });
    return NextResponse.json({ config: cfg });
  }

  if (!session.user.franchiseId) return NextResponse.json({ config: null });

  const franchise = await prisma.franchise.findUnique({
    where: { id: session.user.franchiseId },
    select: { chavePix: true, linkPagamento: true, instrucaoPagamento: true },
  });
  return NextResponse.json({ config: franchise });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // FRANQUEADORA — salva em SystemConfig
    if (session.user.role === "FRANQUEADORA") {
      const data: any = {};
      for (const campo of CAMPOS_FRANQUEADORA) {
        if (body[campo] !== undefined) data[campo] = body[campo];
      }
      const cfg = await prisma.systemConfig.upsert({
        where: { id: "default" },
        create: { id: "default", ...data },
        update: data,
        select: { chavePix: true, linkPagamento: true, instrucaoPagamento: true, qrCodePixUrl: true, mensagemCobrancaFranqueado: true },
      });
      clearConfigCache();
      return NextResponse.json({ config: cfg });
    }

    if (!session.user.franchiseId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // FRANQUEADO — salva no próprio Franchise
    const data: any = {};
    for (const campo of CAMPOS_FRANQUEADO) {
      if (body[campo] !== undefined) data[campo] = body[campo];
    }
    const franchise = await prisma.franchise.update({
      where: { id: session.user.franchiseId },
      data,
      select: { chavePix: true, linkPagamento: true, instrucaoPagamento: true },
    });
    return NextResponse.json({ config: franchise });

  } catch (err: any) {
    console.error("[config-pagamento PATCH]", err);
    return NextResponse.json({ error: "Erro ao salvar: " + (err?.message || "Erro desconhecido") }, { status: 500 });
  }
}
