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

  const emailLogin = (body.emailLogin || body.email || "").trim().toLowerCase();

  // Verificar se o e-mail de login já está em uso antes de criar qualquer registro
  const emailExistente = await prisma.user.findUnique({ where: { email: emailLogin }, select: { id: true } });
  if (emailExistente) {
    return NextResponse.json(
      { error: `O e-mail de login "${emailLogin}" já está cadastrado no sistema. Use outro e-mail ou altere o e-mail do usuário existente.` },
      { status: 409 }
    );
  }

  // Gerar senha
  const senha = body.senha || require("crypto").randomBytes(6).toString("hex") + "S1@";
  const hash = await bcrypt.hash(senha, 10);

  // Criar franquia + usuário em transação — se um falhar, ambos desfazem
  let franchise: any;
  let user: any;
  try {
    ({ franchise, user } = await prisma.$transaction(async (tx) => {
      const f = await tx.franchise.create({
        data: {
          name: body.name, razaoSocial: body.razaoSocial, cnpj: body.cnpj,
          cpf: body.cpf ? body.cpf.replace(/\D/g, "") : null,
          dataNasc: body.dataNasc ? new Date(body.dataNasc) : null,
          responsavel: body.responsavel, email: body.email, telefone: body.telefone,
          cidade: body.cidade, uf: body.uf, endereco: body.endereco, cep: body.cep,
          mensalidade: parseFloat(body.mensalidade) || 200,
          plano: body.plano || "completo",
        },
      });
      const u = await tx.user.create({
        data: {
          name: body.responsavel,
          email: emailLogin,
          password: hash,
          role: "FRANQUEADO",
          franchiseId: f.id,
        },
      });
      return { franchise: f, user: u };
    }));
  } catch (txErr: any) {
    // Erro de unique constraint — identificar QUAL campo colidiu antes de montar a mensagem
    // (a transação cria Franchise.cnpj e User.email, que têm constraints únicas distintas;
    // atribuir toda violação ao e-mail gera falso positivo quando o conflito é de CNPJ)
    if (txErr?.code === "P2002") {
      const target: string[] = Array.isArray(txErr?.meta?.target) ? txErr.meta.target : [];
      if (target.includes("cnpj")) {
        return NextResponse.json(
          { error: `O CNPJ "${body.cnpj}" já está cadastrado em outra unidade franqueada. Verifique se esta unidade já não foi cadastrada antes.` },
          { status: 409 }
        );
      }
      if (target.includes("email")) {
        return NextResponse.json(
          { error: `O e-mail "${emailLogin}" já está em uso. Verifique e tente novamente.` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Já existe um registro com um dos dados informados (e-mail ou CNPJ). Verifique e tente novamente." },
        { status: 409 }
      );
    }
    throw txErr;
  }

  // Enviar email de boas-vindas (não-bloqueante: falha no email não cancela o cadastro)
  let emailEnviado = false;
  let emailErro = "";
  try {
    emailEnviado = await enviarBoasVindasFranqueado({
      email: user.email,
      nome: body.responsavel || user.name || "",
      nomeUnidade: franchise.name,
      senha,
    });
    if (!emailEnviado) emailErro = "Resend retornou erro — verifique a chave RESEND_API_KEY e se o e-mail destino é válido.";
  } catch (emailErr: any) {
    emailErro = emailErr?.message || "Exceção ao chamar Resend";
    console.error("[Franqueados] Erro ao enviar email de boas-vindas:", emailErr);
  }

  return NextResponse.json({ franchise, user, senhaGerada: senha, emailEnviado, emailErro: emailEnviado ? undefined : emailErro });
  } catch (e) {
    return handleApiError(e, "FRANQUEADOS_POST_001");
  }
}
