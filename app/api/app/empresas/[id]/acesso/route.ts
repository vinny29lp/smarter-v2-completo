import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { enviarBoasVindasEmpresa } from "@/lib/email";

// POST — criar acesso ao portal para uma empresa
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const franchiseId = session.user.franchiseId;

  try {
    const empresa = await prisma.company.findFirst({
      where: { id: params.id, ...(franchiseId ? { franchiseId } : {}) },
      include: { users: { select: { id: true, email: true } } },
    });

    if (!empresa) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

    // Check if access already exists
    if (empresa.users && empresa.users.length > 0) {
      return NextResponse.json({ error: "Acesso ao portal já existe para esta empresa." }, { status: 409 });
    }

    // Generate password
    const senha = Math.random().toString(36).slice(-8) + "S1!";
    const hashed = await bcrypt.hash(senha, 12);

    // Create user with EMPRESA role
    const user = await prisma.user.create({
      data: {
        name: empresa.responsavel || empresa.name,
        email: empresa.email,
        password: hashed,
        role: "EMPRESA",
        companyId: empresa.id,
        franchiseId: empresa.franchiseId,
        active: true,
      },
    });

    // Send welcome email (non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://sistema.smarterestagios.com.br";
    enviarBoasVindasEmpresa({
      email: empresa.email,
      nomeEmpresa: empresa.name,
      nomeResponsavel: empresa.responsavel || empresa.name,
      senha,
      loginUrl: appUrl,
    }).catch(e => console.warn("[email] Falha boas-vindas empresa:", e));

    return NextResponse.json({ ok: true, userId: user.id, emailEnviado: true });

  } catch (err: any) {
    if (err?.code === "P2002" && err?.meta?.target?.includes("email")) {
      return NextResponse.json({ error: "E-mail já está em uso no sistema." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Erro ao criar acesso." }, { status: 500 });
  }
}
