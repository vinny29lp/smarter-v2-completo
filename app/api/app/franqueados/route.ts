import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { handleApiError } from "@/lib/api-response";
import { enviarBoasVindasFranqueado } from "@/lib/email";

// ⚡ ESC-002: paginação adicionada — evita payload crescente com 100+ franqueados
export async function GET(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip  = (page - 1) * limit;
  // Busca por nome para filtro na UI
  const search = searchParams.get("search") || "";
  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : {};

  const [franqueados, total] = await Promise.all([
    prisma.franchise.findMany({
      where,
      select: {
        id: true, name: true, razaoSocial: true, cnpj: true, responsavel: true,
        email: true, telefone: true, cidade: true, uf: true,
        status: true, mensalidade: true, cobrarMensalidade: true,
        plano: true, pontuacao: true, createdAt: true,
        users: {
          where: { role: "FRANQUEADO" },
          select: { id: true, name: true, email: true, active: true, lastLoginAt: true, createdAt: true },
        },
        _count: { select: { companies: true, students: { where: { status: "EM_ESTAGIO" } }, contracts: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.franchise.count({ where }),
  ]);

  return NextResponse.json({
    franqueados,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }, {
    // Cache de 60 segundos no CDN — reduz queries repetidas na listagem de franqueados
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=30" },
  });
  } catch (e) {
    return handleApiError(e, "FRANQUEADOS_GET_001");
  }
}

export async function POST(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }
  const body = await req.json();

  // Criar franquia
  const franchise = await prisma.franchise.create({
    data: {
      name: body.name, razaoSocial: body.razaoSocial, cnpj: body.cnpj,
      responsavel: body.responsavel, email: body.email, telefone: body.telefone,
      cidade: body.cidade, uf: body.uf, endereco: body.endereco, cep: body.cep,
      mensalidade: parseFloat(body.mensalidade) || 200,
      plano: body.plano || "completo",
    },
  });

  // Gerar senha aleatória
  const senha = body.senha || Math.random().toString(36).slice(-8) + "S1@";
  const hash = await bcrypt.hash(senha, 10);

  // Criar usuário do franqueado
  const user = await prisma.user.create({
    data: {
      name: body.responsavel,
      email: body.emailLogin || body.email,
      password: hash,
      role: "FRANQUEADO",
      franchiseId: franchise.id,
    },
  });

  // Enviar email de boas-vindas (não-bloqueante: falha no email não cancela o cadastro)
  let emailEnviado = false;
  try {
    emailEnviado = await enviarBoasVindasFranqueado({
      email: user.email,
      nome: body.responsavel || user.name || "",
      nomeUnidade: franchise.name,
      senha,
    });
  } catch (emailErr) {
    console.error("[Franqueados] Erro ao enviar email de boas-vindas:", emailErr);
  }

  return NextResponse.json({ franchise, user, senhaGerada: senha, emailEnviado });
  } catch (e) {
    return handleApiError(e, "FRANQUEADOS_POST_001");
  }
}
