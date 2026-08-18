import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarBoasVindasEmpresa } from "@/lib/email";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkPermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";
import { criarEmpresaSchema, zodError } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Permissão FUNCIONARIO
  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  // Cap alto o suficiente pra caber TODAS as empresas visíveis (própria unidade +
  // migradas) numa única chamada — usado pelo dropdown de seleção de empresa na
  // abertura de vaga (app/dashboard/vagas/nova), que precisa da lista inteira, não
  // só da primeira página. A tela paginada de /dashboard/empresas continua usando
  // o default de 50 (não passa ?limit). Achado em 2026-08-18: sem isso, empresas
  // cadastradas há mais tempo (ex. Coresport, criada em 29/06) ficavam fora da
  // primeira página e nunca apareciam pra seleção.
  const limit = Math.min(2000, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip  = (page - 1) * limit;

  const role = session.user.role;
  const franchiseId = role === "FRANQUEADORA" ? undefined : (session.user.franchiseId || undefined);
  // Empresas migradas (origem=MIGRADO) são visíveis a todas as unidades, além das próprias
  const where = franchiseId ? { OR: [{ franchiseId }, { origem: "MIGRADO" }] } : {};

  const [empresas, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        franchise: { select: { name: true } },
        _count: { select: { contracts: true, vacancies: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.company.count({ where }),
  ]);

  return NextResponse.json({
    empresas,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Permissão FUNCIONARIO
  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  const rawBody = await req.json();
  const parsed = criarEmpresaSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(zodError(parsed.error), { status: 400 });
  }
  const body = parsed.data;

  const franchiseId = body.franchiseId || session?.user?.franchiseId || undefined;
  let company: any = null;
  const senhaPlain = require("crypto").randomBytes(6).toString("hex") + "S1!";

  try {
    company = await prisma.company.create({
      data: {
        name: body.name,
        razaoSocial: body.razaoSocial || "",
        cnpj: body.cnpj,
        setor: body.setor || null,
        email: body.email,
        telefone: body.telefone || null,
        responsavel: body.responsavel || null,
        cargoResponsavel: body.cargoResponsavel || null,
        endereco: body.endereco || null,
        bairro: body.bairro || null,
        cidade: body.cidade,
        uf: body.uf || "",
        cep: body.cep || null,
        site: body.site || null,
        emailFinanceiro: body.emailFinanceiro || null,
        franchiseId: franchiseId || undefined,
      },
    });

    await prisma.gamificationPoint.create({
      data: { franchiseId: franchiseId || "", acao: "empresa_cadastrada", pontos: 300 },
    }).catch(() => {});

    const hash = await bcrypt.hash(senhaPlain, 12);
    await prisma.user.create({
      data: {
        name: body.responsavel || body.name,
        email: body.email,
        password: hash,
        role: "EMPRESA",
        companyId: company.id,
        franchiseId: franchiseId || undefined,
        active: true,
      },
    }).catch(() => {});

  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "CNPJ ou e-mail já cadastrado no sistema." }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || "Erro ao cadastrar empresa." }, { status: 500 });
  }

  // Audit log (fire-and-forget)
  logAudit({
    userId: session.user.id,
    role: session.user.role || "",
    franchiseId,
    acao: "EMPRESA_CRIADA",
    modulo: "empresas",
    detalhes: `empresa:${company.id} | nome:${body.name} | cnpj:${body.cnpj}`,
    ip: getClientIP(req),
  });

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sistema.smarterestagios.com.br";
    const emailOk = await enviarBoasVindasEmpresa({
      email: body.email,
      nomeEmpresa: body.name,
      nomeResponsavel: body.responsavel || body.name,
      senha: senhaPlain,
      loginUrl: appUrl,
    });
    console.log(`[email] boas-vindas empresa: ${emailOk ? "enviado" : "falhou"} → ${body.email}`);
  } catch (emailErr) {
    console.warn("[email] Falha boas-vindas empresa:", emailErr);
  }

  return NextResponse.json({ company }, { status: 201 });
}
