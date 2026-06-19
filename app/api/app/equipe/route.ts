import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { enviarBoasVindasColaborador } from "@/lib/email";

// Retorna o franchiseId efetivo para a sessão:
// - FRANQUEADO/FUNCIONARIO: usa o da sessão
// - FRANQUEADORA: usa o que vier no body, ou o primeiro franchise disponível
async function getEffectiveFranchiseId(session: any, bodyFranchiseId?: string): Promise<string | null> {
  if (session?.user?.franchiseId) return session.user.franchiseId;
  if (session?.user?.role === "FRANQUEADORA") {
    if (bodyFranchiseId) return bodyFranchiseId;
    // Pega o primeiro franchise disponível
    const first = await prisma.franchise.findFirst({ orderBy: { createdAt: "asc" } });
    return first?.id ?? null;
  }
  return null;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const franchiseId = await getEffectiveFranchiseId(session);
  if (!franchiseId) return NextResponse.json({ error: "Nenhuma unidade encontrada" }, { status: 400 });

  const employees = await prisma.employee.findMany({
    where: { franchiseId },
    include: { user: { select: { id: true, name: true, email: true, active: true, role: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  // FRANQUEADORA também vê membros da Equipe Smarter (franchiseId=null, role=EQUIPE)
  let equipe: any[] = [];
  if (session.user.role === "FRANQUEADORA") {
    equipe = await prisma.employee.findMany({
      where: { franchiseId: null, user: { role: "EQUIPE" } },
      include: { user: { select: { id: true, name: true, email: true, active: true, role: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  return NextResponse.json({ employees, equipe });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["FRANQUEADORA","FRANQUEADO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Sem permissão para cadastrar equipe" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, cargo, permissoes = [], senha, franchiseId: bodyFranchiseId, tipo } = body;

  // tipo "equipe" → cria membro da Equipe Smarter (role=EQUIPE, franchiseId=null, só FRANQUEADORA)
  const isEquipe = tipo === "equipe";
  if (isEquipe && session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Apenas a Franqueadora pode criar membros da Equipe Smarter." }, { status: 403 });
  }

  // Para Equipe Smarter, franchiseId é null (vê dados de toda a rede)
  const franchiseId = isEquipe ? null : await getEffectiveFranchiseId(session, bodyFranchiseId);
  if (!isEquipe && !franchiseId) return NextResponse.json({ error: "Unidade não identificada. Selecione uma unidade." }, { status: 400 });

  if (!name || !email) return NextResponse.json({ error: "Nome e e-mail são obrigatórios" }, { status: 400 });
  if (!senha || senha.length < 6) return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "E-mail já cadastrado no sistema" }, { status: 409 });

  let createdUserId: string | null = null;
  try {
    const hash = await bcrypt.hash(senha, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role: (isEquipe ? "EQUIPE" : "FUNCIONARIO") as any,
        franchiseId,
        active: true,
      },
    });
    createdUserId = user.id;

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        franchiseId,
        cargo: cargo || (isEquipe ? "Equipe Smarter" : "Colaborador"),
        permissoes: Array.isArray(permissoes) ? permissoes : [],
      },
      include: { user: { select: { id: true, name: true, email: true, active: true, role: true, createdAt: true } } },
    });

    // Enviar boas-vindas (non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br";
    enviarBoasVindasColaborador({ email, nome: name, senha, loginUrl: appUrl })
      .catch(e => console.warn("[email] Falha boas-vindas equipe:", e));

    return NextResponse.json({ employee }, { status: 201 });
  } catch (err: any) {
    console.error("[equipe POST] erro:", err);
    // Limpar usuário criado se employee falhou
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    const msg = err?.meta?.cause || err?.meta?.message || err?.message || "Erro ao criar colaborador";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
